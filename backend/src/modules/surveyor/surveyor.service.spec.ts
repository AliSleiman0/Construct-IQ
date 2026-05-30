import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { SurveyorService } from './surveyor.service';
import { BoqItem } from './schemas/boq-item.schema';
import { Variation, VariationStatus } from './schemas/variation.schema';
import { Valuation, ValuationStatus } from './schemas/valuation.schema';
import { Project } from '../projects/schemas/project.schema';

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

    const moduleRef = await Test.createTestingModule({
      providers: [
        SurveyorService,
        { provide: getModelToken(BoqItem.name), useValue: boqModel },
        { provide: getModelToken(Variation.name), useValue: variationModel },
        { provide: getModelToken(Valuation.name), useValue: valuationModel },
        { provide: getModelToken(Project.name), useValue: projectModel },
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
    it('defaults status to PENDING with no approver', async () => {
      variationModel.create.mockResolvedValue({ _id: 'v-1' });
      await service.createVariation('org-1', { projectId: 'p1', title: 'Extra slab', impactAmount: 1500 } as any);
      expect(variationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1', projectId: 'p1', title: 'Extra slab', impactAmount: 1500,
          status: VariationStatus.PENDING, approvedById: null, approvedAt: null,
        }),
      );
    });
  });

  describe('approveVariation', () => {
    it('approves a PENDING variation: stamps approver + APPROVED', async () => {
      const doc: any = { status: VariationStatus.PENDING, save: jest.fn(), toObject: () => ({ _id: 'v-1' }) };
      variationModel.findOne.mockResolvedValue(doc);
      await service.approveVariation('v-1', 'org-1', 'qs-1', false);
      expect(doc.status).toBe(VariationStatus.APPROVED);
      expect(doc.approvedById).toBe('qs-1');
      expect(doc.approvedAt).toBeInstanceOf(Date);
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

  describe('certifyValuation', () => {
    it('certifies a SUBMITTED valuation: stamps certifier + CERTIFIED', async () => {
      const doc: any = { status: ValuationStatus.SUBMITTED, save: jest.fn(), toObject: () => ({ _id: 'val-1' }) };
      valuationModel.findOne.mockResolvedValue(doc);
      await service.certifyValuation('val-1', 'org-1', 'qs-1', false);
      expect(doc.status).toBe(ValuationStatus.CERTIFIED);
      expect(doc.certifiedById).toBe('qs-1');
      expect(doc.certifiedAt).toBeInstanceOf(Date);
      expect(doc.save).toHaveBeenCalled();
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
