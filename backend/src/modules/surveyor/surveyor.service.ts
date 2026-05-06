import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BoqItem, BoqItemDocument } from './schemas/boq-item.schema';
import { Variation, VariationDocument, VariationStatus } from './schemas/variation.schema';
import { Valuation, ValuationDocument, ValuationStatus } from './schemas/valuation.schema';
import {
  CreateBoqItemDto,
  CreateVariationDto,
  UpdateVariationDto,
  CreateValuationDto,
  UpdateValuationDto,
} from './dto/create-surveyor.dto';
import { PartialType } from '@nestjs/mapped-types';

class UpdateBoqItemDto extends PartialType(CreateBoqItemDto) {}

@Injectable()
export class SurveyorService {
  constructor(
    @InjectModel(BoqItem.name) private boqModel: Model<BoqItemDocument>,
    @InjectModel(Variation.name) private variationModel: Model<VariationDocument>,
    @InjectModel(Valuation.name) private valuationModel: Model<ValuationDocument>,
  ) {}

  async findAllBoq(organizationId: string, isSuperAdmin: boolean, projectId?: string): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;
    return this.boqModel.find(filter).sort({ code: 1 }).lean();
  }

  async createBoqItem(organizationId: string, dto: CreateBoqItemDto): Promise<any> {
    const existing = await this.boqModel.findOne({ projectId: dto.projectId, code: dto.code });
    if (existing) throw new ConflictException('BOQ code already exists in this project');

    const totalAmount = dto.quantity * dto.unitRate;
    return this.boqModel.create({
      organizationId,
      projectId: dto.projectId,
      code: dto.code,
      description: dto.description,
      unit: dto.unit,
      quantity: dto.quantity,
      unitRate: dto.unitRate,
      totalAmount,
      isLocked: dto.isLocked ?? false,
    });
  }

  async updateBoqItem(id: string, organizationId: string, dto: UpdateBoqItemDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const item = await this.boqModel.findOne(filter);
    if (!item) throw new NotFoundException('BOQ item not found');
    if (item.isLocked) throw new BadRequestException('This BOQ item is locked');

    if (dto.description !== undefined) item.description = dto.description;
    if (dto.unit !== undefined) item.unit = dto.unit;
    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.unitRate !== undefined) item.unitRate = dto.unitRate;
    if (dto.isLocked !== undefined) item.isLocked = dto.isLocked;
    item.totalAmount = item.quantity * item.unitRate;

    await item.save();
    return item.toObject();
  }

  async deleteBoqItem(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const item = await this.boqModel.findOne(filter);
    if (!item) throw new NotFoundException('BOQ item not found');
    await this.boqModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'BOQ item deleted successfully' };
  }

  async findAllVariations(organizationId: string, isSuperAdmin: boolean, projectId?: string): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;
    return this.variationModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async createVariation(organizationId: string, dto: CreateVariationDto): Promise<any> {
    return this.variationModel.create({
      organizationId,
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description ?? null,
      impactAmount: dto.impactAmount,
      currency: dto.currency ?? 'USD',
      status: VariationStatus.PENDING,
      approvedById: null,
      approvedAt: null,
    });
  }

  async updateVariation(id: string, organizationId: string, dto: UpdateVariationDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const variation = await this.variationModel.findOne(filter);
    if (!variation) throw new NotFoundException('Variation not found');
    Object.assign(variation, dto);
    await variation.save();
    return variation.toObject();
  }

  async approveVariation(id: string, organizationId: string, approvedById: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const variation = await this.variationModel.findOne(filter);
    if (!variation) throw new NotFoundException('Variation not found');
    if (variation.status !== VariationStatus.PENDING) {
      throw new BadRequestException('Only PENDING variations can be approved');
    }

    variation.status = VariationStatus.APPROVED;
    variation.approvedById = approvedById;
    variation.approvedAt = new Date();
    await variation.save();
    return variation.toObject();
  }

  async deleteVariation(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const variation = await this.variationModel.findOne(filter);
    if (!variation) throw new NotFoundException('Variation not found');
    await this.variationModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Variation deleted successfully' };
  }

  async findAllValuations(organizationId: string, isSuperAdmin: boolean, projectId?: string): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;
    return this.valuationModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async createValuation(organizationId: string, dto: CreateValuationDto): Promise<any> {
    const existing = await this.valuationModel.findOne({ projectId: dto.projectId, period: dto.period });
    if (existing) throw new ConflictException('A valuation for this period already exists');

    return this.valuationModel.create({
      organizationId,
      projectId: dto.projectId,
      period: dto.period,
      amountUsd: dto.amountUsd,
      retentionUsd: dto.retentionUsd ?? 0,
      status: ValuationStatus.DRAFT,
      certifiedById: null,
      certifiedAt: null,
    });
  }

  async updateValuation(id: string, organizationId: string, dto: UpdateValuationDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const valuation = await this.valuationModel.findOne(filter);
    if (!valuation) throw new NotFoundException('Valuation not found');
    Object.assign(valuation, dto);
    await valuation.save();
    return valuation.toObject();
  }

  async certifyValuation(id: string, organizationId: string, certifiedById: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const valuation = await this.valuationModel.findOne(filter);
    if (!valuation) throw new NotFoundException('Valuation not found');
    if (valuation.status !== ValuationStatus.SUBMITTED) {
      throw new BadRequestException('Only SUBMITTED valuations can be certified');
    }

    valuation.status = ValuationStatus.CERTIFIED;
    valuation.certifiedById = certifiedById;
    valuation.certifiedAt = new Date();
    await valuation.save();
    return valuation.toObject();
  }
}
