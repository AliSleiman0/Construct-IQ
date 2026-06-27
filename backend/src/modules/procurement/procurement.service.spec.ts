import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { Supplier } from './schemas/supplier.schema';
import { PurchaseOrder, applyPoTotals } from './schemas/purchase-order.schema';
import { Delivery } from './schemas/delivery.schema';
import { MaterialRequest } from './schemas/material-request.schema';
import { Project } from '../projects/schemas/project.schema';
import { DeliveryStatus } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

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
    poModel = { find: jest.fn().mockReturnValue(selectLean([])), findOne: jest.fn() };
    projectModel = { find: jest.fn().mockReturnValue(selectLean([])) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: getModelToken(Supplier.name), useValue: {} },
        { provide: getModelToken(PurchaseOrder.name), useValue: poModel },
        { provide: getModelToken(Delivery.name), useValue: deliveryModel },
        { provide: getModelToken(MaterialRequest.name), useValue: {} },
        { provide: getModelToken(Project.name), useValue: projectModel },
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
      expect(poModel.findOne).not.toHaveBeenCalled();
      expect(projectModel.find).not.toHaveBeenCalled();
      expect(res.status).toBe(DeliveryStatus.DELIVERED);
      expect(res.receivedById).toBe('pro-1');
    });
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
        { provide: getModelToken(Project.name), useValue: {} },
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
