import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Unit, UnitDocument } from './schemas/unit.schema';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { ProgressPhoto, ProgressPhotoDocument } from './schemas/progress-photo.schema';
import { CreateUnitDto, CreatePaymentDto, CreateProgressPhotoDto } from './dto/create-unit.dto';
import { UnitStatus, PaymentStatus } from '../../common/enums';
import { PartialType } from '@nestjs/mapped-types';

class UpdateUnitDto extends PartialType(CreateUnitDto) {}
class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}

@Injectable()
export class UnitsService {
  constructor(
    @InjectModel(Unit.name) private unitModel: Model<UnitDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(ProgressPhoto.name) private photoModel: Model<ProgressPhotoDocument>,
  ) {}

  async findAllUnits(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
    status?: UnitStatus,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    return this.unitModel.find(filter).sort({ floor: 1, label: 1 }).lean();
  }

  async findUnitById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const unit = await this.unitModel.findOne(filter).lean();
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  async createUnit(organizationId: string, dto: CreateUnitDto): Promise<any> {
    return this.unitModel.create({
      organizationId,
      projectId: dto.projectId,
      label: dto.label,
      floor: dto.floor,
      position: dto.position ?? null,
      type: dto.type,
      bedrooms: dto.bedrooms ?? null,
      bathrooms: dto.bathrooms ?? null,
      sqft: dto.sqft,
      priceUsd: dto.priceUsd,
      status: dto.status ?? UnitStatus.AVAILABLE,
      buyerId: dto.buyerId ?? null,
      imageUrl: dto.imageUrl ?? null,
      description: dto.description ?? null,
    });
  }

  async updateUnit(id: string, organizationId: string, dto: UpdateUnitDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const unit = await this.unitModel.findOne(filter);
    if (!unit) throw new NotFoundException('Unit not found');
    Object.assign(unit, dto);
    await unit.save();
    return unit.toObject();
  }

  async deleteUnit(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const unit = await this.unitModel.findOne(filter);
    if (!unit) throw new NotFoundException('Unit not found');
    await this.unitModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Unit deleted successfully' };
  }

  async findPayments(
    organizationId: string,
    isSuperAdmin: boolean,
    buyerId?: string,
    unitId?: string,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (buyerId) filter.buyerId = buyerId;
    if (unitId) filter.unitId = unitId;
    return this.paymentModel.find(filter).sort({ installmentNo: 1 }).lean();
  }

  async createPayment(organizationId: string, dto: CreatePaymentDto): Promise<any> {
    return this.paymentModel.create({
      organizationId,
      unitId: dto.unitId,
      buyerId: dto.buyerId,
      installmentNo: dto.installmentNo,
      totalInstallments: dto.totalInstallments,
      label: dto.label,
      amountUsd: dto.amountUsd,
      dueDate: new Date(dto.dueDate),
      paidAt: null,
      status: PaymentStatus.PENDING,
      invoiceNumber: dto.invoiceNumber ?? null,
    });
  }

  async updatePayment(id: string, organizationId: string, dto: UpdatePaymentDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const payment = await this.paymentModel.findOne(filter);
    if (!payment) throw new NotFoundException('Payment not found');

    if (dto.dueDate !== undefined) payment.dueDate = new Date(dto.dueDate);
    if ((dto as any).status !== undefined) {
      (payment as any).status = (dto as any).status;
      if ((dto as any).status === PaymentStatus.PAID && !payment.paidAt) {
        payment.paidAt = new Date();
      }
    }
    if (dto.invoiceNumber !== undefined) payment.invoiceNumber = dto.invoiceNumber ?? null;

    await payment.save();
    return payment.toObject();
  }

  async findPhotos(organizationId: string, isSuperAdmin: boolean, projectId?: string): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;
    return this.photoModel.find(filter).sort({ takenAt: -1 }).lean();
  }

  async createPhoto(organizationId: string, uploadedById: string, dto: CreateProgressPhotoDto): Promise<any> {
    return this.photoModel.create({
      organizationId,
      projectId: dto.projectId,
      milestoneId: dto.milestoneId ?? null,
      url: dto.url,
      caption: dto.caption ?? null,
      takenAt: new Date(dto.takenAt),
      uploadedById,
    });
  }

  async deletePhoto(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const photo = await this.photoModel.findOneAndDelete(filter);
    if (!photo) throw new NotFoundException('Photo not found');
    return { message: 'Photo deleted successfully' };
  }
}
