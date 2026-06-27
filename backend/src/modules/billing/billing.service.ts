import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatus } from '../../common/enums';
import { PartialType } from '@nestjs/mapped-types';

class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}

@Injectable()
export class BillingService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
  ) {}

  async findAll(organizationId: string, isSuperAdmin: boolean): Promise<any[]> {
    const filter = isSuperAdmin ? {} : { organizationId };
    return this.invoiceModel.find(filter).sort({ issuedAt: -1 }).lean();
  }

  async create(dto: CreateInvoiceDto, isSuperAdmin: boolean): Promise<any> {
    // Platform subscription invoices are issued by the platform operator only.
    // The endpoint requires manage:all, but the PermissionsGuard's manage:company
    // bypass would otherwise let an Org Admin through and write an invoice for ANY
    // org via dto.organizationId — this explicit gate closes that cross-tenant hole.
    if (!isSuperAdmin) {
      throw new ForbiddenException('Only platform administrators can create invoices');
    }

    // Global uniqueness matches the schema's global unique index on `number`.
    // Per-org numbering (compound index + migration) is tracked in issue #31.
    const existing = await this.invoiceModel.findOne({ number: dto.number });
    if (existing) throw new ConflictException('Invoice number already exists');

    return this.invoiceModel.create({
      organizationId: dto.organizationId,
      planId: dto.planId,
      number: dto.number,
      amountUsd: dto.amountUsd,
      status: dto.status ?? InvoiceStatus.ISSUED,
      issuedAt: new Date(dto.issuedAt),
      dueAt: new Date(dto.dueAt),
      paidAt: null,
      notes: dto.notes ?? null,
    });
  }

  async update(id: string, dto: UpdateInvoiceDto, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const invoice = await this.invoiceModel.findOne(filter);
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (dto.status !== undefined) invoice.status = dto.status;
    if (dto.status === InvoiceStatus.PAID && !invoice.paidAt) {
      invoice.paidAt = new Date();
    }
    if (dto.notes !== undefined) invoice.notes = dto.notes ?? null;

    await invoice.save();
    return invoice.toObject();
  }
}
