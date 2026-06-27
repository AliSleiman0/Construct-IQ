import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { Supplier } from './schemas/supplier.schema';
import { PurchaseOrder, applyPoTotals } from './schemas/purchase-order.schema';
import { Delivery } from './schemas/delivery.schema';
import { MaterialRequest } from './schemas/material-request.schema';
import { Project } from '../projects/schemas/project.schema';
import { DeliveryStatus, MaterialRequestStatus, PurchaseOrderStatus } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

// Inert NotificationsService provider (notify fan-out is fire-and-forget and
// covered by its own dedicated tests; here we only need DI to resolve).
const notifProvider = () => ({
  provide: NotificationsService,
  useValue: { notify: jest.fn().mockResolvedValue(undefined), notifyMany: jest.fn().mockResolvedValue(undefined) },
});
// A Project mock whose findOne(...).select(...).lean() resolves to no members,
// so projectMemberIds(...) returns [] (approve/reject/confirm need this).
const projectWithMembers = (members: any[] = []) => ({
  findOne: jest.fn().mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ members }) }) }),
});

/**
 * Unit tests for the deliveries slice of ProcurementService (SE-7): member-scoped
 * listing (deliveries have no projectId, so scope resolves via PO -> project) and
 * the narrow goods-received confirmation. Mongoose models are fully mocked.
 */
describe('ProcurementService — deliveries (SE-7)', () => {
  let service: ProcurementService;
  let deliveryModel: any;
  let poModel: any;
  let projectModel: any;
  let auditService: any;

  const sortLean = (result: any[]) => ({ sort: () => ({ lean: () => Promise.resolve(result) }) });
  const selectLean = (result: any) => ({ select: () => ({ lean: () => Promise.resolve(result) }) });

  const eng: JwtPayload = {
    sub: 'eng-1', email: 'e@x.com', organizationId: 'org-1', isSuperAdmin: false,
    permissions: ['read:deliveries', 'confirm:deliveries'],
  };
  const procurement: JwtPayload = {
    sub: 'pro-1', email: 'p@x.com', organizationId: 'org-1', isSuperAdmin: false,
    permissions: ['manage:deliveries'],
  };

  beforeEach(async () => {
    deliveryModel = {
      find: jest.fn().mockReturnValue(sortLean([])),
      findOne: jest.fn(),
    };
    poModel = {
      find: jest.fn().mockReturnValue(selectLean([])),
      findOne: jest.fn().mockReturnValue(selectLean({ projectId: 'p1' })),
    };
    projectModel = {
      find: jest.fn().mockReturnValue(selectLean([])),
      findOne: jest.fn().mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ members: [] }) }) }),
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: getModelToken(Supplier.name), useValue: {} },
        { provide: getModelToken(PurchaseOrder.name), useValue: poModel },
        { provide: getModelToken(Delivery.name), useValue: deliveryModel },
        { provide: getModelToken(MaterialRequest.name), useValue: {} },
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: AuditService, useValue: auditService },
        notifProvider(),
      ],
    }).compile();
    service = moduleRef.get(ProcurementService);
  });

  describe('findAllDeliveries', () => {
    it('stays org-wide for an orgWide viewer (manage:deliveries) — no member scoping', async () => {
      await service.findAllDeliveries('org-1', false, { userId: 'pro-1', orgWide: true });
      expect(projectModel.find).not.toHaveBeenCalled();
      expect(deliveryModel.find).toHaveBeenCalledWith({ organizationId: 'org-1' });
    });

    it('does NOT scope by org for super admins', async () => {
      await service.findAllDeliveries('org-1', true, { userId: 'sa', orgWide: true });
      expect(deliveryModel.find).toHaveBeenCalledWith({});
    });

    it('member-scopes a field viewer to PO ids on their member projects', async () => {
      projectModel.find.mockReturnValue(selectLean([{ _id: 'p1' }, { _id: 'p2' }]));
      poModel.find.mockReturnValue(selectLean([{ _id: 'po-1' }, { _id: 'po-2' }]));
      await service.findAllDeliveries('org-1', false, { userId: 'eng-1', orgWide: false });
      expect(deliveryModel.find).toHaveBeenCalledWith({
        organizationId: 'org-1',
        purchaseOrderId: { $in: ['po-1', 'po-2'] },
      });
    });

    it('returns [] when the field viewer is a member of no projects', async () => {
      projectModel.find.mockReturnValue(selectLean([]));
      const res = await service.findAllDeliveries('org-1', false, { userId: 'eng-1', orgWide: false });
      expect(res).toEqual([]);
      expect(deliveryModel.find).not.toHaveBeenCalled();
    });

    it('returns [] when member projects have no purchase orders', async () => {
      projectModel.find.mockReturnValue(selectLean([{ _id: 'p1' }]));
      poModel.find.mockReturnValue(selectLean([]));
      const res = await service.findAllDeliveries('org-1', false, { userId: 'eng-1', orgWide: false });
      expect(res).toEqual([]);
      expect(deliveryModel.find).not.toHaveBeenCalled();
    });

    it('enriches each delivery with its PO number + projectId', async () => {
      deliveryModel.find.mockReturnValue(sortLean([{ _id: 'del-1', purchaseOrderId: 'po-1' }]));
      poModel.find.mockReturnValue(selectLean([{ _id: 'po-1', poNumber: 'PO-100', projectId: 'p1' }]));
      const res = await service.findAllDeliveries('org-1', false, { userId: 'pro-1', orgWide: true });
      expect(res[0]).toMatchObject({ _id: 'del-1', poNumber: 'PO-100', projectId: 'p1' });
    });
  });

  describe('confirmDelivery', () => {
    const makeDelivery = (over: Partial<any> = {}) => {
      const doc: any = {
        _id: 'del-1', purchaseOrderId: 'po-1', organizationId: 'org-1',
        status: DeliveryStatus.PENDING, receivedById: null, deliveryDate: null, notes: null,
        ...over,
      };
      doc.save = jest.fn().mockResolvedValue(doc);
      doc.toObject = jest.fn().mockReturnValue(doc);
      return doc;
    };

    it('throws NotFound when the delivery is missing', async () => {
      deliveryModel.findOne.mockResolvedValue(null);
      await expect(service.confirmDelivery('nope', eng, {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forces status=DELIVERED + receivedById=current user and defaults deliveryDate', async () => {
      const doc = makeDelivery();
      deliveryModel.findOne.mockResolvedValue(doc);
      poModel.findOne.mockReturnValue(selectLean({ projectId: 'p1' }));
      projectModel.find.mockReturnValue(selectLean([{ _id: 'p1' }]));

      const res = await service.confirmDelivery('del-1', eng, {});
      expect(res.status).toBe(DeliveryStatus.DELIVERED);
      expect(res.receivedById).toBe('eng-1');
      expect(res.deliveryDate).toBeInstanceOf(Date);
      expect(doc.save).toHaveBeenCalled();
    });

    it('honours a provided deliveryDate and notes', async () => {
      const doc = makeDelivery();
      deliveryModel.findOne.mockResolvedValue(doc);
      poModel.findOne.mockReturnValue(selectLean({ projectId: 'p1' }));
      projectModel.find.mockReturnValue(selectLean([{ _id: 'p1' }]));

      const res = await service.confirmDelivery('del-1', eng, { deliveryDate: '2026-05-20', notes: 'left at gate' });
      expect(res.deliveryDate).toEqual(new Date('2026-05-20'));
      expect(res.notes).toBe('left at gate');
    });

    it('rejects a field user confirming a delivery on a non-member project (Forbidden)', async () => {
      const doc = makeDelivery();
      deliveryModel.findOne.mockResolvedValue(doc);
      poModel.findOne.mockReturnValue(selectLean({ projectId: 'p9' }));
      projectModel.find.mockReturnValue(selectLean([{ _id: 'p1' }])); // member of p1, not p9
      await expect(service.confirmDelivery('del-1', eng, {})).rejects.toBeInstanceOf(ForbiddenException);
      expect(doc.save).not.toHaveBeenCalled();
    });

    it('skips the member-gate for an orgWide caller (manage:deliveries)', async () => {
      const doc = makeDelivery();
      deliveryModel.findOne.mockResolvedValue(doc);
      const res = await service.confirmDelivery('del-1', procurement, {});
      // The member-gate (projectModel.find) is skipped for an orgWide caller. The
      // PO is still looked up afterwards to resolve notification recipients (#35).
      expect(projectModel.find).not.toHaveBeenCalled();
      expect(res.status).toBe(DeliveryStatus.DELIVERED);
      expect(res.receivedById).toBe('pro-1');
    });

    it('audits the goods-receipt confirmation (#33)', async () => {
      const doc = makeDelivery();
      deliveryModel.findOne.mockResolvedValue(doc);
      await service.confirmDelivery('del-1', procurement, {});
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CONFIRM', entityType: 'DELIVERY', actorUserId: 'pro-1', entityId: 'del-1' }),
      );
    });
  });
});

/**
 * #33 — segregation of duties + audit logging on material-request review.
 * A requester may not approve their own MR (Super Admins exempt); approve/reject
 * both write an audit entry.
 */
describe('ProcurementService — material request review (#33)', () => {
  let service: ProcurementService;
  let materialRequestModel: any;
  let auditService: any;

  const makeMr = (over: any = {}) => {
    const doc: any = {
      _id: 'mr-1', organizationId: 'org-1', projectId: 'p1',
      status: MaterialRequestStatus.PENDING, requestedById: 'requester-1', reviewedById: null,
      reviewedAt: null, reviewNote: null, ...over,
    };
    doc.save = jest.fn().mockResolvedValue(doc);
    doc.toObject = jest.fn().mockReturnValue(doc);
    return doc;
  };

  beforeEach(async () => {
    materialRequestModel = { findOne: jest.fn() };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: getModelToken(Supplier.name), useValue: {} },
        { provide: getModelToken(PurchaseOrder.name), useValue: {} },
        { provide: getModelToken(Delivery.name), useValue: {} },
        { provide: getModelToken(MaterialRequest.name), useValue: materialRequestModel },
        { provide: getModelToken(Project.name), useValue: projectWithMembers() },
        { provide: AuditService, useValue: auditService },
        notifProvider(),
      ],
    }).compile();
    service = moduleRef.get(ProcurementService);
  });

  it('blocks the requester from approving their own MR (403); no save/audit', async () => {
    const mr = makeMr({ requestedById: 'requester-1' });
    materialRequestModel.findOne.mockResolvedValue(mr);
    await expect(
      service.approveMaterialRequest('mr-1', 'org-1', 'requester-1', {} as any, false),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mr.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('lets a different reviewer approve, stamping review fields and auditing', async () => {
    const mr = makeMr({ requestedById: 'requester-1' });
    materialRequestModel.findOne.mockResolvedValue(mr);
    await service.approveMaterialRequest('mr-1', 'org-1', 'pro-1', { reviewNote: 'ok' } as any, false);
    expect(mr.status).toBe(MaterialRequestStatus.APPROVED);
    expect(mr.reviewedById).toBe('pro-1');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'APPROVE', entityType: 'MATERIAL_REQUEST', actorUserId: 'pro-1' }),
    );
  });

  it('lets a Super Admin approve their own MR', async () => {
    const mr = makeMr({ requestedById: 'sa-1' });
    materialRequestModel.findOne.mockResolvedValue(mr);
    await service.approveMaterialRequest('mr-1', 'org-1', 'sa-1', {} as any, true);
    expect(mr.status).toBe(MaterialRequestStatus.APPROVED);
    expect(mr.save).toHaveBeenCalled();
  });

  it('audits a rejection (no SoD on reject — requester may withdraw)', async () => {
    const mr = makeMr({ requestedById: 'requester-1' });
    materialRequestModel.findOne.mockResolvedValue(mr);
    await service.rejectMaterialRequest('mr-1', 'org-1', 'requester-1', {} as any, false);
    expect(mr.status).toBe(MaterialRequestStatus.REJECTED);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REJECT', entityType: 'MATERIAL_REQUEST' }),
    );
  });
});

/**
 * PO money invariant (issue #22): totalAmount must always be derived from line items.
 * applyPoTotals is the pure core the schema pre-save hook runs on every PO save, so
 * testing it directly exercises the exact logic without a live Mongoose connection.
 */
describe('PurchaseOrder totals invariant — applyPoTotals', () => {
  const item = (over: Partial<any> = {}) => ({
    description: 'x', quantity: 1, unitPrice: 0, totalPrice: 0, unit: null, notes: null, ...over,
  });

  it('overrides a tampered header totalAmount with the sum of line items (create path)', () => {
    const po: any = {
      totalAmount: 999999,
      items: [item({ quantity: 2, unitPrice: 300 }), item({ quantity: 1, unitPrice: 400 })],
    };
    applyPoTotals(po);
    expect(po.totalAmount).toBe(1000);
    expect(po.items[0].totalPrice).toBe(600);
    expect(po.items[1].totalPrice).toBe(400);
  });

  it('recomputes the header when items are replaced, ignoring a stale totalAmount (update path)', () => {
    const po: any = { totalAmount: 600, items: [item({ quantity: 5, unitPrice: 50 })] };
    applyPoTotals(po);
    expect(po.totalAmount).toBe(250);
    expect(po.items[0].totalPrice).toBe(250);
  });

  it('rounds binary-float dust to 2 decimals (3 x 0.1 = 0.3, not 0.30000000000000004)', () => {
    const po: any = { totalAmount: 0, items: [item({ quantity: 3, unitPrice: 0.1 })] };
    applyPoTotals(po);
    expect(po.items[0].totalPrice).toBe(0.3);
    expect(po.totalAmount).toBe(0.3);
  });

  it('preserves a manual lump-sum totalAmount when there are no line items', () => {
    const po: any = { totalAmount: 500, items: [] };
    applyPoTotals(po);
    expect(po.totalAmount).toBe(500);
  });

  it('also preserves a lump-sum total when items is null/absent', () => {
    const po: any = { totalAmount: 750, items: null };
    applyPoTotals(po);
    expect(po.totalAmount).toBe(750);
  });
});

/**
 * #28 — PO and Delivery generic updates are transition-guarded. Privileged moves
 * (PO →APPROVED/REJECTED, Delivery →DELIVERED) are reachable only through their
 * dedicated endpoints; receivedById is no longer client-settable on a delivery.
 */
describe('ProcurementService — status transition guards (#28)', () => {
  let service: ProcurementService;
  let poModel: any;
  let deliveryModel: any;

  const makeDoc = (over: any) => {
    const doc: any = { ...over };
    doc.save = jest.fn().mockResolvedValue(doc);
    doc.toObject = jest.fn().mockReturnValue(doc);
    return doc;
  };

  beforeEach(async () => {
    poModel = { findOne: jest.fn() };
    deliveryModel = { findOne: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: getModelToken(Supplier.name), useValue: {} },
        { provide: getModelToken(PurchaseOrder.name), useValue: poModel },
        { provide: getModelToken(Delivery.name), useValue: deliveryModel },
        { provide: getModelToken(MaterialRequest.name), useValue: {} },
        { provide: getModelToken(Project.name), useValue: projectWithMembers() },
        { provide: AuditService, useValue: { log: jest.fn() } },
        notifProvider(),
      ],
    }).compile();
    service = moduleRef.get(ProcurementService);
  });

  it('PO: allows DRAFT → SUBMITTED', async () => {
    const po = makeDoc({ status: 'DRAFT' });
    poModel.findOne.mockResolvedValue(po);
    await service.updatePO('po-1', 'org-1', { status: 'SUBMITTED' } as any, false);
    expect(po.status).toBe('SUBMITTED');
    expect(po.save).toHaveBeenCalled();
  });

  it('PO: rejects SUBMITTED → APPROVED via generic update (must use /approve)', async () => {
    const po = makeDoc({ status: 'SUBMITTED' });
    poModel.findOne.mockResolvedValue(po);
    await expect(
      service.updatePO('po-1', 'org-1', { status: 'APPROVED' } as any, false),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(po.save).not.toHaveBeenCalled();
  });

  it('Delivery: allows PENDING → IN_TRANSIT', async () => {
    const d = makeDoc({ status: DeliveryStatus.PENDING });
    deliveryModel.findOne.mockResolvedValue(d);
    await service.updateDelivery('d-1', 'org-1', { status: DeliveryStatus.IN_TRANSIT } as any, false);
    expect(d.status).toBe(DeliveryStatus.IN_TRANSIT);
  });

  it('Delivery: rejects → DELIVERED via generic update (must use /confirm)', async () => {
    const d = makeDoc({ status: DeliveryStatus.PENDING });
    deliveryModel.findOne.mockResolvedValue(d);
    await expect(
      service.updateDelivery('d-1', 'org-1', { status: DeliveryStatus.DELIVERED } as any, false),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(d.save).not.toHaveBeenCalled();
  });

  it('Delivery: receivedById is not assignable through the generic update', async () => {
    const d = makeDoc({ status: DeliveryStatus.PENDING, receivedById: null });
    deliveryModel.findOne.mockResolvedValue(d);
    await service.updateDelivery('d-1', 'org-1', { receivedById: 'attacker' } as any, false);
    expect(d.receivedById).toBeNull();
  });
});

/**
 * #33 — PO approve/reject write an audit entry on the successful state change.
 */
describe('ProcurementService — PO approval audit (#33)', () => {
  let service: ProcurementService;
  let poModel: any;
  let auditService: any;

  const makePo = (over: any = {}) => {
    const doc: any = {
      _id: 'po-1', organizationId: 'org-1', projectId: 'p1',
      status: PurchaseOrderStatus.SUBMITTED, ...over,
    };
    doc.save = jest.fn().mockResolvedValue(doc);
    doc.toObject = jest.fn().mockReturnValue(doc);
    return doc;
  };

  beforeEach(async () => {
    poModel = { findOne: jest.fn() };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: getModelToken(Supplier.name), useValue: {} },
        { provide: getModelToken(PurchaseOrder.name), useValue: poModel },
        { provide: getModelToken(Delivery.name), useValue: {} },
        { provide: getModelToken(MaterialRequest.name), useValue: {} },
        { provide: getModelToken(Project.name), useValue: projectWithMembers() },
        { provide: AuditService, useValue: auditService },
        notifProvider(),
      ],
    }).compile();
    service = moduleRef.get(ProcurementService);
  });

  it('audits a PO approval', async () => {
    poModel.findOne.mockResolvedValue(makePo());
    await service.approvePO('po-1', 'org-1', 'pro-1', false);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'APPROVE', entityType: 'PURCHASE_ORDER', actorUserId: 'pro-1', entityId: 'po-1' }),
    );
  });

  it('audits a PO rejection with the reason', async () => {
    poModel.findOne.mockResolvedValue(makePo());
    await service.rejectPO('po-1', 'org-1', 'pro-1', 'over budget', false);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REJECT', entityType: 'PURCHASE_ORDER', metadata: expect.objectContaining({ reason: 'over budget' }) }),
    );
  });
});

/**
 * #34 — delete referential integrity: a supplier with live POs can't be deleted;
 * delivery and material-request deletes are now soft-deletes (was hard deleteOne).
 */
describe('ProcurementService — delete integrity (#34)', () => {
  let service: ProcurementService;
  let supplierModel: any;
  let poModel: any;
  let deliveryModel: any;
  let materialRequestModel: any;

  beforeEach(async () => {
    supplierModel = { findOne: jest.fn(), updateOne: jest.fn().mockResolvedValue({}) };
    poModel = { countDocuments: jest.fn() };
    deliveryModel = { findOne: jest.fn(), updateOne: jest.fn().mockResolvedValue({}), deleteOne: jest.fn() };
    materialRequestModel = { findOne: jest.fn(), updateOne: jest.fn().mockResolvedValue({}), deleteOne: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: getModelToken(Supplier.name), useValue: supplierModel },
        { provide: getModelToken(PurchaseOrder.name), useValue: poModel },
        { provide: getModelToken(Delivery.name), useValue: deliveryModel },
        { provide: getModelToken(MaterialRequest.name), useValue: materialRequestModel },
        { provide: getModelToken(Project.name), useValue: projectWithMembers() },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
        notifProvider(),
      ],
    }).compile();
    service = moduleRef.get(ProcurementService);
  });

  it('deleteSupplier: blocks when live purchase orders reference the supplier', async () => {
    supplierModel.findOne.mockResolvedValue({ _id: 's-1' });
    poModel.countDocuments.mockResolvedValue(1);
    await expect(service.deleteSupplier('s-1', 'org-1', false)).rejects.toBeInstanceOf(ConflictException);
    expect(supplierModel.updateOne).not.toHaveBeenCalled();
  });

  it('deleteSupplier: soft-deletes when no POs reference it', async () => {
    supplierModel.findOne.mockResolvedValue({ _id: 's-1' });
    poModel.countDocuments.mockResolvedValue(0);
    await service.deleteSupplier('s-1', 'org-1', false);
    expect(supplierModel.updateOne).toHaveBeenCalledWith({ _id: 's-1' }, { deletedAt: expect.any(Date) });
  });

  it('deleteDelivery: soft-deletes (no hard deleteOne)', async () => {
    deliveryModel.findOne.mockResolvedValue({ _id: 'd-1' });
    await service.deleteDelivery('d-1', 'org-1', false);
    expect(deliveryModel.updateOne).toHaveBeenCalledWith({ _id: 'd-1' }, { deletedAt: expect.any(Date) });
    expect(deliveryModel.deleteOne).not.toHaveBeenCalled();
  });

  it('deleteMaterialRequest: soft-deletes (no hard deleteOne)', async () => {
    materialRequestModel.findOne.mockResolvedValue({ _id: 'mr-1' });
    await service.deleteMaterialRequest('mr-1', 'org-1', false);
    expect(materialRequestModel.updateOne).toHaveBeenCalledWith({ _id: 'mr-1' }, { deletedAt: expect.any(Date) });
    expect(materialRequestModel.deleteOne).not.toHaveBeenCalled();
  });
});

/**
 * #30 — a PO's expected delivery date can't precede its order date nor sit in the
 * past, and the supplier on-time rate must ignore deliveries lacking a target or
 * actual date (instead of scoring null targets as "on-time").
 */
describe('ProcurementService — date validation (#30)', () => {
  let service: ProcurementService;
  let poModel: any;
  let supplierModel: any;
  let deliveryModel: any;

  const futureDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString();
  };

  const makeDoc = (over: any) => {
    const doc: any = { ...over };
    doc.save = jest.fn().mockResolvedValue(doc);
    doc.toObject = jest.fn().mockReturnValue(doc);
    return doc;
  };

  beforeEach(async () => {
    poModel = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((doc) => Promise.resolve({ _id: 'po-1', ...doc })),
    };
    supplierModel = { findOne: jest.fn() };
    deliveryModel = { aggregate: jest.fn().mockResolvedValue([]) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: getModelToken(Supplier.name), useValue: supplierModel },
        { provide: getModelToken(PurchaseOrder.name), useValue: poModel },
        { provide: getModelToken(Delivery.name), useValue: deliveryModel },
        { provide: getModelToken(MaterialRequest.name), useValue: {} },
        { provide: getModelToken(Project.name), useValue: projectWithMembers() },
        { provide: AuditService, useValue: { log: jest.fn() } },
        notifProvider(),
      ],
    }).compile();
    service = moduleRef.get(ProcurementService);
  });

  const baseCreateDto = (over: any = {}) => ({
    projectId: 'p-1',
    supplierId: 's-1',
    poNumber: 'PO-1',
    orderDate: '2026-06-01',
    ...over,
  });

  it('createPO: rejects expectedDeliveryDate before orderDate', async () => {
    await expect(
      service.createPO('org-1', baseCreateDto({ expectedDeliveryDate: '2026-05-01' }) as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(poModel.create).not.toHaveBeenCalled();
  });

  it('createPO: rejects an expectedDeliveryDate in the past', async () => {
    await expect(
      service.createPO('org-1', baseCreateDto({ expectedDeliveryDate: '2020-01-01' }) as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(poModel.create).not.toHaveBeenCalled();
  });

  it('createPO: accepts a future expectedDeliveryDate after orderDate', async () => {
    await service.createPO('org-1', baseCreateDto({ expectedDeliveryDate: futureDate() }) as any);
    expect(poModel.create).toHaveBeenCalledTimes(1);
  });

  it('createPO: accepts a PO with no expectedDeliveryDate', async () => {
    await service.createPO('org-1', baseCreateDto() as any);
    expect(poModel.create).toHaveBeenCalledTimes(1);
  });

  it('updatePO: rejects setting expectedDeliveryDate before the stored orderDate', async () => {
    const po = makeDoc({ status: 'DRAFT', orderDate: new Date('2026-06-01') });
    poModel.findOne.mockResolvedValue(po);
    await expect(
      service.updatePO('po-1', 'org-1', { expectedDeliveryDate: '2026-05-01' } as any, false),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(po.save).not.toHaveBeenCalled();
  });

  it('getSupplierPerformance: on-time pipeline excludes null target/actual dates', async () => {
    supplierModel.findOne.mockReturnValue({ lean: () => Promise.resolve({ _id: 's-1', name: 'Acme' }) });
    // poStats (first call) + deliveryStats (second call)
    poModel.aggregate = jest.fn().mockResolvedValue([]);
    await service.getSupplierPerformance('s-1', 'org-1', false);

    const deliveryPipeline = deliveryModel.aggregate.mock.calls[0][0];
    const nullGuard = deliveryPipeline.find(
      (stage: any) => stage.$match && 'deliveryDate' in stage.$match,
    );
    expect(nullGuard).toBeDefined();
    expect(nullGuard.$match.deliveryDate).toEqual({ $ne: null });
    expect(nullGuard.$match['po.expectedDeliveryDate']).toEqual({ $ne: null });
  });
});
