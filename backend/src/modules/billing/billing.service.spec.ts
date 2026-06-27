import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { Invoice } from './schemas/invoice.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatus } from '../../common/enums';

/**
 * Unit tests for BillingService.create (issue #23): platform subscription invoices
 * are Super-Admin-only. A non-super-admin (e.g. an Org Admin who slips through the
 * PermissionsGuard's manage:company bypass) must never reach the model, so they can
 * never write an invoice for any org via dto.organizationId. Invoice model is mocked.
 */
describe('BillingService — create (issue #23)', () => {
  let service: BillingService;
  let invoiceModel: any;

  const dto = (over: Partial<CreateInvoiceDto> = {}): CreateInvoiceDto => ({
    organizationId: 'org-B',
    planId: 'plan-1',
    number: 'INV-1',
    amountUsd: 100,
    issuedAt: '2026-06-27',
    dueAt: '2026-07-27',
    ...over,
  });

  beforeEach(async () => {
    invoiceModel = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((doc) => Promise.resolve({ _id: 'inv-1', ...doc })),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: getModelToken(Invoice.name), useValue: invoiceModel },
      ],
    }).compile();
    service = moduleRef.get(BillingService);
  });

  it('rejects a non-super-admin caller with Forbidden and never touches the model', async () => {
    await expect(service.create(dto(), false)).rejects.toBeInstanceOf(ForbiddenException);
    expect(invoiceModel.findOne).not.toHaveBeenCalled();
    expect(invoiceModel.create).not.toHaveBeenCalled();
  });

  it('does not let a non-super-admin write a cross-tenant invoice (dto.organizationId ignored)', async () => {
    // An Org Admin of org-A attempting to bill org-B is blocked before any persistence.
    await expect(service.create(dto({ organizationId: 'org-B' }), false)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(invoiceModel.create).not.toHaveBeenCalled();
  });

  it('persists when the caller is a super admin, honoring the target org from the body', async () => {
    const res = await service.create(dto({ organizationId: 'org-B' }), true);
    expect(invoiceModel.create).toHaveBeenCalledTimes(1);
    const saved = invoiceModel.create.mock.calls[0][0];
    expect(saved.organizationId).toBe('org-B');
    expect(saved.status).toBe(InvoiceStatus.ISSUED); // default when not supplied
    expect(saved.paidAt).toBeNull();
    expect(res._id).toBe('inv-1');
  });

  it('throws Conflict when the invoice number already exists (super admin)', async () => {
    invoiceModel.findOne.mockResolvedValue({ _id: 'dupe' });
    await expect(service.create(dto(), true)).rejects.toBeInstanceOf(ConflictException);
    expect(invoiceModel.create).not.toHaveBeenCalled();
  });
});

/**
 * Unit tests for BillingService.update (issue #27): invoice status changes are
 * Super-Admin-only AND must follow the legal payment lifecycle — no jumping
 * straight to PAID, no reviving terminal states.
 */
describe('BillingService — update (issue #27)', () => {
  let service: BillingService;
  let invoiceModel: any;

  const makeInvoice = (status: InvoiceStatus) => {
    const doc: any = { _id: 'inv-1', status, paidAt: null, notes: null };
    doc.save = jest.fn().mockResolvedValue(doc);
    doc.toObject = jest.fn().mockReturnValue(doc);
    return doc;
  };

  beforeEach(async () => {
    invoiceModel = { findOne: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: getModelToken(Invoice.name), useValue: invoiceModel },
      ],
    }).compile();
    service = moduleRef.get(BillingService);
  });

  it('rejects a non-super-admin caller with Forbidden before any lookup', async () => {
    await expect(
      service.update('inv-1', { status: InvoiceStatus.PAID } as any, 'org-A', false),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(invoiceModel.findOne).not.toHaveBeenCalled();
  });

  it('rejects an illegal transition DRAFT → PAID (400) and does not save', async () => {
    const doc = makeInvoice(InvoiceStatus.DRAFT);
    invoiceModel.findOne.mockResolvedValue(doc);
    await expect(
      service.update('inv-1', { status: InvoiceStatus.PAID } as any, 'org-A', true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('allows the legal transition ISSUED → PAID and stamps paidAt', async () => {
    const doc = makeInvoice(InvoiceStatus.ISSUED);
    invoiceModel.findOne.mockResolvedValue(doc);
    await service.update('inv-1', { status: InvoiceStatus.PAID } as any, 'org-A', true);
    expect(doc.status).toBe(InvoiceStatus.PAID);
    expect(doc.paidAt).toBeInstanceOf(Date);
    expect(doc.save).toHaveBeenCalled();
  });

  it('rejects moving out of a terminal PAID state (400)', async () => {
    const doc = makeInvoice(InvoiceStatus.PAID);
    invoiceModel.findOne.mockResolvedValue(doc);
    await expect(
      service.update('inv-1', { status: InvoiceStatus.ISSUED } as any, 'org-A', true),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows a notes-only update without a status change', async () => {
    const doc = makeInvoice(InvoiceStatus.ISSUED);
    invoiceModel.findOne.mockResolvedValue(doc);
    await service.update('inv-1', { notes: 'follow up' } as any, 'org-A', true);
    expect(doc.notes).toBe('follow up');
    expect(doc.status).toBe(InvoiceStatus.ISSUED);
    expect(doc.save).toHaveBeenCalled();
  });
});
