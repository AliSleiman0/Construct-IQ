import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { Supplier } from './schemas/supplier.schema';
import { PurchaseOrder } from './schemas/purchase-order.schema';
import { Delivery } from './schemas/delivery.schema';
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
