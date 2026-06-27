import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SurveyorService } from './surveyor.service';
import { BoqItem } from './schemas/boq-item.schema';
import { Variation, VariationStatus } from './schemas/variation.schema';
import { Valuation, ValuationStatus } from './schemas/valuation.schema';
import { Project } from '../projects/schemas/project.schema';
import { AuditService } from '../audit/audit.service';

/**
 * Unit tests for SurveyorService — the SE-1-class member-scoping on the three
 * list endpoints (a read:budget-not-manage caller is restricted to their member
 * projects) plus the BOQ create/update business rules (totalAmount math, unique
 * code, locked-item protection). Models fully mocked; no DB.
 */
describe('SurveyorService', () => {
  let service: SurveyorService;
  let boqModel: any;
  let variationModel: any;
  let valuationModel: any;
  let projectModel: any;
  let auditService: any;

  // find(...).sort(...).lean()
  const listChain = (result: any[]) => ({ sort: () => ({ lean: () => Promise.resolve(result) }) });
  // projectModel.find(...).select(...).lean()
  const projectFindChain = (result: any[]) => ({ select: () => ({ lean: () => Promise.resolve(result) }) });

  beforeEach(async () => {
    boqModel = {
      find: jest.fn().mockReturnValue(listChain([])),
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };
    variationModel = {
      find: jest.fn().mockReturnValue(listChain([])),
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };
    valuationModel = {
      find: jest.fn().mockReturnValue(listChain([])),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    projectModel = { find: jest.fn().mockReturnValue(projectFindChain([])) };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SurveyorService,
        { provide: getModelToken(BoqItem.name), useValue: boqModel },
        { provide: getModelToken(Variation.name), useValue: variationModel },
        { provide: getModelToken(Valuation.name), useValue: valuationModel },
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();
    service = moduleRef.get(SurveyorService);
  });

  describe('findAllBoq member-scoping', () => {
    it('org-scopes only (no project constraint) when no viewer is supplied', async () => {
      await service.findAllBoq('org-1', false);
      expect(boqModel.find).toHaveBeenCalledWith({ organizationId: 'org-1' });
    });

    it('does NOT org-scope for super admins', async () => {
      await service.findAllBoq('org-1', true);
      expect(boqModel.find).toHaveBeenCalledWith({});
    });

    it('restricts a non-orgWide viewer to their member projects', async () => {
      projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }, { _id: 'p2' }]));
      await service.findAllBoq('org-1', false, undefined, { userId: 'pm-1', orgWide: false });
      expect(projectModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', 'members.userId': 'pm-1' });
      expect(boqModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: { $in: ['p1', 'p2'] } });
    });

    it('does NOT member-scope an orgWide viewer (e.g. SURVEYOR with manage:budget)', async () => {
      await service.findAllBoq('org-1', false, undefined, { userId: 'qs-1', orgWide: true });
      expect(projectModel.find).not.toHaveBeenCalled();
      expect(boqModel.find).toHaveBeenCalledWith({ organizationId: 'org-1' });
    });

    it('honours an explicit projectId only when the viewer is a member', async () => {
      projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }]));
      await service.findAllBoq('org-1', false, 'p1', { userId: 'pm-1', orgWide: false });
      expect(boqModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: 'p1' });
    });

    it('matches nothing when the viewer requests a project they are not a member of', async () => {
      projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }]));
      await service.findAllBoq('org-1', false, 'p9', { userId: 'pm-1', orgWide: false });
      expect(boqModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: { $in: [] } });
    });

    it('short-circuits to [] (no query) when the viewer belongs to no projects', async () => {
      projectModel.find.mockReturnValue(projectFindChain([]));
      const res = await service.findAllBoq('org-1', false, undefined, { userId: 'pm-1', orgWide: false });
      expect(res).toEqual([]);
      expect(boqModel.find).not.toHaveBeenCalled();
    });
  });

  describe('findAllVariations / findAllValuations member-scoping', () => {
    it('member-scopes variations the same way', async () => {
      projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }]));
      await service.findAllVariations('org-1', false, undefined, { userId: 'pm-1', orgWide: false });
      expect(variationModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: { $in: ['p1'] } });
    });

    it('member-scopes valuations the same way', async () => {
      projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }]));
      await service.findAllValuations('org-1', false, undefined, { userId: 'pm-1', orgWide: false });
      expect(valuationModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: { $in: ['p1'] } });
    });
  });

  describe('createBoqItem', () => {
    it('computes totalAmount = quantity × unitRate and persists with the caller org', async () => {
      boqModel.findOne.mockResolvedValue(null);
      boqModel.create.mockResolvedValue({ _id: 'b-1' });
      await service.createBoqItem('org-1', {
        projectId: 'p1', code: 'C.01', description: 'Concrete', unit: 'm³', quantity: 10, unitRate: 250,
      } as any);
      expect(boqModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org-1', projectId: 'p1', code: 'C.01', totalAmount: 2500, isLocked: false }),
      );
    });

    it('rejects a duplicate code within the same project (409)', async () => {
      boqModel.findOne.mockResolvedValue({ _id: 'existing' });
      await expect(
        service.createBoqItem('org-1', { projectId: 'p1', code: 'C.01', description: 'x', unit: 'm³', quantity: 1, unitRate: 1 } as any),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(boqModel.create).not.toHaveBeenCalled();
    });
  });

  describe('updateBoqItem', () => {
    it('recomputes totalAmount and saves editable fields', async () => {
      const doc: any = { isLocked: false, quantity: 1, unitRate: 1, save: jest.fn(), toObject: () => ({ _id: 'b-1' }) };
      boqModel.findOne.mockResolvedValue(doc);
      await service.updateBoqItem('b-1', 'org-1', { quantity: 4, unitRate: 50 } as any, false);
      expect(doc.quantity).toBe(4);
      expect(doc.totalAmount).toBe(200);
      expect(doc.save).toHaveBeenCalled();
    });

    it('rejects edits to a locked item (400) — protects certified BOQs', async () => {
      boqModel.findOne.mockResolvedValue({ isLocked: true });
      await expect(
        service.updateBoqItem('b-1', 'org-1', { quantity: 9 } as any, false),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFound (org-scoped) when missing', async () => {
      boqModel.findOne.mockResolvedValue(null);
      await expect(service.updateBoqItem('b-1', 'org-1', {} as any, false)).rejects.toBeInstanceOf(NotFoundException);
      expect(boqModel.findOne).toHaveBeenCalledWith({ _id: 'b-1', organizationId: 'org-1' });
    });
  });

  describe('createVariation', () => {
    it('defaults status to PENDING with no approver and records the creator', async () => {
      variationModel.create.mockResolvedValue({ _id: 'v-1' });
      await service.createVariation('org-1', 'qs-1', { projectId: 'p1', title: 'Extra slab', impactAmount: 1500 } as any);
      expect(variationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1', projectId: 'p1', title: 'Extra slab', impactAmount: 1500,
          status: VariationStatus.PENDING, createdById: 'qs-1', approvedById: null, approvedAt: null,
        }),
      );
    });
  });

  describe('updateVariation (#26 — status not settable via generic PATCH)', () => {
    const makeVariation = (over: Partial<any> = {}) => {
      const doc: any = {
        title: 'Old', description: 'old', impactAmount: 100,
        status: VariationStatus.PENDING, approvedById: null, approvedAt: null, ...over,
      };
      doc.save = jest.fn().mockResolvedValue(doc);
      doc.toObject = jest.fn().mockReturnValue(doc);
      return doc;
    };

    it('updates only editable fields and never touches status/approver', async () => {
      const doc = makeVariation();
      variationModel.findOne.mockResolvedValue(doc);
      // A tampering caller passes status; the service must ignore it.
      await service.updateVariation('v-1', 'org-1', { title: 'New', impactAmount: 5000, status: VariationStatus.APPROVED } as any, false);
      expect(doc.title).toBe('New');
      expect(doc.impactAmount).toBe(5000);
      expect(doc.status).toBe(VariationStatus.PENDING); // unchanged
      expect(doc.approvedById).toBeNull();
      expect(doc.save).toHaveBeenCalled();
    });

    it('throws NotFound (org-scoped) when missing', async () => {
      variationModel.findOne.mockResolvedValue(null);
      await expect(service.updateVariation('v-1', 'org-1', { title: 'x' } as any, false)).rejects.toBeInstanceOf(NotFoundException);
      expect(variationModel.findOne).toHaveBeenCalledWith({ _id: 'v-1', organizationId: 'org-1' });
    });
  });

  describe('approveVariation', () => {
    const pending = (over: any = {}) => ({
      _id: 'v-1', organizationId: 'org-1', projectId: 'p1', impactAmount: 1500,
      status: VariationStatus.PENDING, createdById: 'creator-1',
      save: jest.fn(), toObject: () => ({ _id: 'v-1' }), ...over,
    });

    it('approves a PENDING variation: stamps approver + APPROVED and audits', async () => {
      const doc: any = pending({ createdById: 'creator-1' });
      variationModel.findOne.mockResolvedValue(doc);
      await service.approveVariation('v-1', 'org-1', 'qs-1', false);
      expect(doc.status).toBe(VariationStatus.APPROVED);
      expect(doc.approvedById).toBe('qs-1');
      expect(doc.approvedAt).toBeInstanceOf(Date);
      expect(doc.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'APPROVE', entityType: 'VARIATION', actorUserId: 'qs-1', entityId: 'v-1' }),
      );
    });

    // #33 segregation of duties
    it('blocks the creator from approving their own variation (403) and does not save/audit', async () => {
      const doc: any = pending({ createdById: 'qs-1' });
      variationModel.findOne.mockResolvedValue(doc);
      await expect(service.approveVariation('v-1', 'org-1', 'qs-1', false)).rejects.toBeInstanceOf(ForbiddenException);
      expect(doc.save).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('allows a Super Admin to approve even their own variation', async () => {
      const doc: any = pending({ createdById: 'sa-1' });
      variationModel.findOne.mockResolvedValue(doc);
      await service.approveVariation('v-1', 'org-1', 'sa-1', true);
      expect(doc.status).toBe(VariationStatus.APPROVED);
      expect(doc.save).toHaveBeenCalled();
    });

    it('rejects approving a non-PENDING variation (400)', async () => {
      variationModel.findOne.mockResolvedValue({ status: VariationStatus.APPROVED });
      await expect(service.approveVariation('v-1', 'org-1', 'qs-1', false)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFound (org-scoped) when missing', async () => {
      variationModel.findOne.mockResolvedValue(null);
      await expect(service.approveVariation('v-1', 'org-1', 'qs-1', false)).rejects.toBeInstanceOf(NotFoundException);
      expect(variationModel.findOne).toHaveBeenCalledWith({ _id: 'v-1', organizationId: 'org-1' });
    });
  });

  describe('rejectVariation (#33)', () => {
    it('rejects a PENDING variation: stamps rejecter + REJECTED + reason and audits', async () => {
      const doc: any = {
        _id: 'v-1', organizationId: 'org-1', projectId: 'p1', status: VariationStatus.PENDING,
        createdById: 'creator-1', save: jest.fn(), toObject: () => ({ _id: 'v-1' }),
      };
      variationModel.findOne.mockResolvedValue(doc);
      await service.rejectVariation('v-1', 'org-1', 'qs-1', 'out of scope', false);
      expect(doc.status).toBe(VariationStatus.REJECTED);
      expect(doc.rejectedById).toBe('qs-1');
      expect(doc.rejectedAt).toBeInstanceOf(Date);
      expect(doc.rejectionReason).toBe('out of scope');
      expect(doc.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REJECT', entityType: 'VARIATION', actorUserId: 'qs-1' }),
      );
    });

    it('allows the creator to reject (withdraw) their own variation — no SoD on reject', async () => {
      const doc: any = {
        status: VariationStatus.PENDING, createdById: 'qs-1', organizationId: 'org-1', projectId: 'p1',
        save: jest.fn(), toObject: () => ({}),
      };
      variationModel.findOne.mockResolvedValue(doc);
      await service.rejectVariation('v-1', 'org-1', 'qs-1', undefined, false);
      expect(doc.status).toBe(VariationStatus.REJECTED);
      expect(doc.rejectionReason).toBeNull();
    });

    it('rejects rejecting a non-PENDING variation (400)', async () => {
      variationModel.findOne.mockResolvedValue({ status: VariationStatus.APPROVED });
      await expect(service.rejectVariation('v-1', 'org-1', 'qs-1', 'x', false)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('createValuation', () => {
    it('defaults status to DRAFT with no certifier', async () => {
      valuationModel.findOne.mockResolvedValue(null);
      valuationModel.create.mockResolvedValue({ _id: 'val-1' });
      await service.createValuation('org-1', { projectId: 'p1', period: 'April 2026', amountUsd: 1000, retentionUsd: 50 } as any);
      expect(valuationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1', projectId: 'p1', period: 'April 2026', amountUsd: 1000, retentionUsd: 50,
          status: ValuationStatus.DRAFT, certifiedById: null, certifiedAt: null,
        }),
      );
    });

    it('defaults retentionUsd to 0 when omitted', async () => {
      valuationModel.findOne.mockResolvedValue(null);
      valuationModel.create.mockResolvedValue({ _id: 'val-1' });
      await service.createValuation('org-1', { projectId: 'p1', period: 'May 2026', amountUsd: 1000 } as any);
      expect(valuationModel.create).toHaveBeenCalledWith(expect.objectContaining({ retentionUsd: 0 }));
    });

    it('rejects a duplicate period within the same project (409)', async () => {
      valuationModel.findOne.mockResolvedValue({ _id: 'existing' });
      await expect(
        service.createValuation('org-1', { projectId: 'p1', period: 'April 2026', amountUsd: 1000 } as any),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(valuationModel.create).not.toHaveBeenCalled();
    });
  });

  describe('#29 — financial bounds', () => {
    it('createValuation rejects retention greater than the amount', async () => {
      valuationModel.findOne.mockResolvedValue(null); // no duplicate period
      await expect(
        service.createValuation('org-1', { projectId: 'p1', period: 'Jun', amountUsd: 1000, retentionUsd: 1200 } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(valuationModel.create).not.toHaveBeenCalled();
    });

    it('createValuation accepts retention within the amount', async () => {
      valuationModel.findOne.mockResolvedValue(null);
      valuationModel.create.mockResolvedValue({ _id: 'val-1' });
      await service.createValuation('org-1', { projectId: 'p1', period: 'Jul', amountUsd: 1000, retentionUsd: 50 } as any);
      expect(valuationModel.create).toHaveBeenCalled();
    });

    it('updateValuation rejects when the new retention exceeds the (effective) amount', async () => {
      const doc: any = { amountUsd: 1000, retentionUsd: 0, status: ValuationStatus.DRAFT, save: jest.fn(), toObject: () => ({}) };
      valuationModel.findOne.mockResolvedValue(doc);
      await expect(
        service.updateValuation('val-1', 'org-1', { retentionUsd: 1500 } as any, false),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(doc.save).not.toHaveBeenCalled();
    });

    it('createVariation rejects a zero impact amount', async () => {
      await expect(
        service.createVariation('org-1', 'qs-1', { projectId: 'p1', title: 'No-op', impactAmount: 0 } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(variationModel.create).not.toHaveBeenCalled();
    });

    it('createVariation accepts a negative (deduction) impact amount', async () => {
      variationModel.create.mockResolvedValue({ _id: 'v-1' });
      await service.createVariation('org-1', 'qs-1', { projectId: 'p1', title: 'Deduct', impactAmount: -500 } as any);
      expect(variationModel.create).toHaveBeenCalled();
    });
  });

  describe('updateValuation (#28 — transition-guarded status)', () => {
    const makeValuation = (status: ValuationStatus) => {
      const doc: any = { status, amountUsd: 100, retentionUsd: 0 };
      doc.save = jest.fn().mockResolvedValue(doc);
      doc.toObject = jest.fn().mockReturnValue(doc);
      return doc;
    };

    it('allows the self-service DRAFT → SUBMITTED move', async () => {
      const doc = makeValuation(ValuationStatus.DRAFT);
      valuationModel.findOne.mockResolvedValue(doc);
      await service.updateValuation('val-1', 'org-1', { status: ValuationStatus.SUBMITTED } as any, false);
      expect(doc.status).toBe(ValuationStatus.SUBMITTED);
      expect(doc.save).toHaveBeenCalled();
    });

    it('rejects DRAFT → CERTIFIED via generic update (must use /certify)', async () => {
      const doc = makeValuation(ValuationStatus.DRAFT);
      valuationModel.findOne.mockResolvedValue(doc);
      await expect(
        service.updateValuation('val-1', 'org-1', { status: ValuationStatus.CERTIFIED } as any, false),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(doc.save).not.toHaveBeenCalled();
    });

    it('edits amounts without touching status when status is omitted', async () => {
      const doc = makeValuation(ValuationStatus.DRAFT);
      valuationModel.findOne.mockResolvedValue(doc);
      await service.updateValuation('val-1', 'org-1', { amountUsd: 5000 } as any, false);
      expect(doc.amountUsd).toBe(5000);
      expect(doc.status).toBe(ValuationStatus.DRAFT);
    });
  });

  describe('certifyValuation', () => {
    it('certifies a SUBMITTED valuation: stamps certifier + CERTIFIED', async () => {
      const doc: any = { status: ValuationStatus.SUBMITTED, save: jest.fn(), toObject: () => ({ _id: 'val-1' }) };
      valuationModel.findOne.mockResolvedValue(doc);
      await service.certifyValuation('val-1', 'org-1', 'qs-1', false);
      expect(doc.status).toBe(ValuationStatus.CERTIFIED);
      expect(doc.certifiedById).toBe('qs-1');
      expect(doc.certifiedAt).toBeInstanceOf(Date);
      expect(doc.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CERTIFY', entityType: 'VALUATION', actorUserId: 'qs-1' }),
      );
    });

    it('rejects certifying a DRAFT valuation — must be submitted first (400)', async () => {
      valuationModel.findOne.mockResolvedValue({ status: ValuationStatus.DRAFT });
      await expect(service.certifyValuation('val-1', 'org-1', 'qs-1', false)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects re-certifying an already-CERTIFIED valuation (400)', async () => {
      valuationModel.findOne.mockResolvedValue({ status: ValuationStatus.CERTIFIED });
      await expect(service.certifyValuation('val-1', 'org-1', 'qs-1', false)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFound (org-scoped) when missing', async () => {
      valuationModel.findOne.mockResolvedValue(null);
      await expect(service.certifyValuation('val-1', 'org-1', 'qs-1', false)).rejects.toBeInstanceOf(NotFoundException);
      expect(valuationModel.findOne).toHaveBeenCalledWith({ _id: 'val-1', organizationId: 'org-1' });
    });
  });
});
