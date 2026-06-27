import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { UnitsService } from './units.service';
import { Unit } from './schemas/unit.schema';
import { Payment } from './schemas/payment.schema';
import { ProgressPhoto } from './schemas/progress-photo.schema';
import { Project } from '../projects/schemas/project.schema';
import { PaymentStatus } from '../../common/enums';

/**
 * Unit tests for UnitsService.findPhotos — org + project-membership scoping of
 * progress photos (the leak fix). Other units/payments methods are unchanged.
 * All models fully mocked; no DB.
 */
describe('UnitsService.findPhotos', () => {
  let service: UnitsService;
  let photoModel: any;
  let projectModel: any;

  const findChain = (result: any[]) => ({ sort: () => ({ lean: () => Promise.resolve(result) }) });
  const projectFindChain = (result: any[]) => ({ select: () => ({ lean: () => Promise.resolve(result) }) });

  beforeEach(async () => {
    photoModel = { find: jest.fn().mockReturnValue(findChain([])) };
    projectModel = { find: jest.fn().mockReturnValue(projectFindChain([])) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: getModelToken(Unit.name), useValue: {} },
        { provide: getModelToken(Payment.name), useValue: {} },
        { provide: getModelToken(ProgressPhoto.name), useValue: photoModel },
        { provide: getModelToken(Project.name), useValue: projectModel },
      ],
    }).compile();
    service = moduleRef.get(UnitsService);
  });

  it('scopes by organizationId for non-super-admins', async () => {
    await service.findPhotos('org-1', false);
    expect(photoModel.find).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('does NOT scope by org for super admins', async () => {
    await service.findPhotos('org-1', true);
    expect(photoModel.find).toHaveBeenCalledWith({});
  });

  it('restricts a non-orgWide viewer to their member projects', async () => {
    projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }, { _id: 'p2' }]));
    await service.findPhotos('org-1', false, undefined, { userId: 'eng-1', orgWide: false });
    expect(photoModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: { $in: ['p1', 'p2'] } });
  });

  it('does NOT member-scope an orgWide viewer (manage:documents)', async () => {
    await service.findPhotos('org-1', false, undefined, { userId: 'pm-1', orgWide: true });
    expect(projectModel.find).not.toHaveBeenCalled();
    expect(photoModel.find).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('matches nothing when a non-orgWide viewer requests a non-member project', async () => {
    projectModel.find.mockReturnValue(projectFindChain([{ _id: 'p1' }]));
    await service.findPhotos('org-1', false, 'p9', { userId: 'eng-1', orgWide: false });
    expect(photoModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: { $in: [] } });
  });

  it('returns [] when the viewer belongs to no projects', async () => {
    projectModel.find.mockReturnValue(projectFindChain([]));
    const res = await service.findPhotos('org-1', false, undefined, { userId: 'eng-1', orgWide: false });
    expect(res).toEqual([]);
    expect(photoModel.find).not.toHaveBeenCalled();
  });
});

/**
 * #29 — unit payment installments may not collectively exceed the unit price.
 */
describe('UnitsService.createPayment (#29 bounds)', () => {
  let service: UnitsService;
  let unitModel: any;
  let paymentModel: any;

  const leanOnce = (result: any) => ({ lean: () => Promise.resolve(result) });

  const dto = (amountUsd: number) => ({
    unitId: 'u-1', buyerId: 'b-1', installmentNo: 1, totalInstallments: 4,
    label: 'Down', amountUsd, dueDate: '2026-07-01',
  });

  beforeEach(async () => {
    unitModel = { findOne: jest.fn().mockReturnValue(leanOnce({ _id: 'u-1', priceUsd: 1000 })) };
    paymentModel = {
      aggregate: jest.fn().mockResolvedValue([{ total: 0 }]),
      create: jest.fn().mockImplementation((d) => Promise.resolve({ _id: 'pay-1', ...d })),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: getModelToken(Unit.name), useValue: unitModel },
        { provide: getModelToken(Payment.name), useValue: paymentModel },
        { provide: getModelToken(ProgressPhoto.name), useValue: {} },
        { provide: getModelToken(Project.name), useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(UnitsService);
  });

  it('accepts an installment that keeps the running total within the unit price', async () => {
    paymentModel.aggregate.mockResolvedValue([{ total: 600 }]); // 600 + 400 = 1000 (== price, ok)
    await service.createPayment('org-1', dto(400) as any);
    expect(paymentModel.create).toHaveBeenCalled();
  });

  it('rejects an installment that would push the total over the unit price', async () => {
    paymentModel.aggregate.mockResolvedValue([{ total: 800 }]); // 800 + 300 = 1100 > 1000
    await expect(service.createPayment('org-1', dto(300) as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(paymentModel.create).not.toHaveBeenCalled();
  });

  it('throws NotFound when the unit does not exist (org-scoped)', async () => {
    unitModel.findOne.mockReturnValue(leanOnce(null));
    await expect(service.createPayment('org-1', dto(100) as any)).rejects.toBeInstanceOf(NotFoundException);
  });
});

/**
 * #34 — referential integrity: a unit with recorded payments can't be deleted.
 */
describe('UnitsService.deleteUnit (#34 payment guard)', () => {
  let service: UnitsService;
  let unitModel: any;
  let paymentModel: any;

  beforeEach(async () => {
    unitModel = { findOne: jest.fn(), updateOne: jest.fn().mockResolvedValue({}) };
    paymentModel = { countDocuments: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: getModelToken(Unit.name), useValue: unitModel },
        { provide: getModelToken(Payment.name), useValue: paymentModel },
        { provide: getModelToken(ProgressPhoto.name), useValue: {} },
        { provide: getModelToken(Project.name), useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(UnitsService);
  });

  it('blocks deletion when the unit has recorded payments', async () => {
    unitModel.findOne.mockResolvedValue({ _id: 'u-1' });
    paymentModel.countDocuments.mockResolvedValue(2);
    await expect(service.deleteUnit('u-1', 'org-1', false)).rejects.toBeInstanceOf(ConflictException);
    expect(unitModel.updateOne).not.toHaveBeenCalled();
  });

  it('soft-deletes the unit when it has no payments', async () => {
    unitModel.findOne.mockResolvedValue({ _id: 'u-1' });
    paymentModel.countDocuments.mockResolvedValue(0);
    const res = await service.deleteUnit('u-1', 'org-1', false);
    expect(unitModel.updateOne).toHaveBeenCalledWith({ _id: 'u-1' }, { deletedAt: expect.any(Date) });
    expect(res).toEqual({ message: 'Unit deleted successfully' });
  });
});

/**
 * #36 — amount-tracked PARTIAL payments: updatePayment derives status from the
 * amount received (0 → PENDING, part → PARTIAL, full → PAID, stamping paidAt).
 */
describe('UnitsService.updatePayment (#36 PARTIAL)', () => {
  let service: UnitsService;
  let paymentModel: any;

  const makePayment = (over: any = {}) => {
    const doc: any = { _id: 'pay-1', amountUsd: 1000, paidAmountUsd: 0, status: PaymentStatus.PENDING, paidAt: null, ...over };
    doc.save = jest.fn().mockResolvedValue(doc);
    doc.toObject = () => doc;
    return doc;
  };

  beforeEach(async () => {
    paymentModel = { findOne: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: getModelToken(Unit.name), useValue: {} },
        { provide: getModelToken(Payment.name), useValue: paymentModel },
        { provide: getModelToken(ProgressPhoto.name), useValue: {} },
        { provide: getModelToken(Project.name), useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(UnitsService);
  });

  it('a part payment (0 < x < amount) → PARTIAL, paidAt stays null', async () => {
    const doc = makePayment();
    paymentModel.findOne.mockResolvedValue(doc);
    await service.updatePayment('pay-1', 'org-1', { paidAmountUsd: 400 } as any, false);
    expect(doc.paidAmountUsd).toBe(400);
    expect(doc.status).toBe(PaymentStatus.PARTIAL);
    expect(doc.paidAt).toBeNull();
  });

  it('a full payment (= amount) → PAID and stamps paidAt', async () => {
    const doc = makePayment();
    paymentModel.findOne.mockResolvedValue(doc);
    await service.updatePayment('pay-1', 'org-1', { paidAmountUsd: 1000 } as any, false);
    expect(doc.status).toBe(PaymentStatus.PAID);
    expect(doc.paidAt).toBeInstanceOf(Date);
  });

  it('zeroing the amount → PENDING and clears paidAt', async () => {
    const doc = makePayment({ paidAmountUsd: 500, status: PaymentStatus.PARTIAL, paidAt: null });
    paymentModel.findOne.mockResolvedValue(doc);
    await service.updatePayment('pay-1', 'org-1', { paidAmountUsd: 0 } as any, false);
    expect(doc.status).toBe(PaymentStatus.PENDING);
    expect(doc.paidAmountUsd).toBe(0);
  });

  it('rejects paidAmountUsd greater than the installment amount (400)', async () => {
    paymentModel.findOne.mockResolvedValue(makePayment());
    await expect(
      service.updatePayment('pay-1', 'org-1', { paidAmountUsd: 1500 } as any, false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
