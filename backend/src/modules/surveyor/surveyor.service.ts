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
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import {
  CreateBoqItemDto,
  CreateVariationDto,
  UpdateVariationDto,
  CreateValuationDto,
  UpdateValuationDto,
} from './dto/create-surveyor.dto';
import { PartialType } from '@nestjs/mapped-types';
import { assertStatusTransition, TransitionMap } from '../../common/util/status-transition.util';

class UpdateBoqItemDto extends PartialType(CreateBoqItemDto) {}

// Self-service valuation transitions allowed through the generic update.
// DRAFT→SUBMITTED is the "submit for certification" step (no dedicated endpoint).
// SUBMITTED→CERTIFIED is dedicated-only (certifyValuation stamps certifiedById/At).
const VALUATION_TRANSITIONS: TransitionMap<ValuationStatus> = {
  [ValuationStatus.DRAFT]: [ValuationStatus.SUBMITTED],
};

/**
 * Who is asking. When `orgWide` is false the caller only sees cost rows for the
 * projects they belong to (field roles, read-only budget viewers); when true
 * they see the whole org. Mirrors the issues/reports/tasks viewer pattern.
 */
export interface SurveyorViewer {
  userId: string;
  orgWide: boolean;
}

@Injectable()
export class SurveyorService {
  constructor(
    @InjectModel(BoqItem.name) private boqModel: Model<BoqItemDocument>,
    @InjectModel(Variation.name) private variationModel: Model<VariationDocument>,
    @InjectModel(Valuation.name) private valuationModel: Model<ValuationDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  /** Project ids the user is a member of, within their org. */
  private async memberProjectIds(organizationId: string, userId: string): Promise<string[]> {
    const projects = await this.projectModel
      .find({ organizationId, 'members.userId': userId })
      .select('_id')
      .lean();
    return projects.map((p: any) => String(p._id));
  }

  /**
   * Constrain a list filter to the caller's member projects.
   *   - orgWide / super-admin → no extra constraint (returns null sentinel handled by caller).
   *   - no member projects     → caller passes [] which we translate to match-nothing.
   *   - explicit projectId     → honoured only if the caller is a member, else match nothing.
   */
  private applyProjectScope(
    filter: Record<string, unknown>,
    projectId: string | undefined,
    restrictIds: string[],
  ): void {
    if (projectId) {
      filter.projectId = restrictIds.includes(projectId) ? projectId : { $in: [] };
    } else {
      filter.projectId = { $in: restrictIds };
    }
  }

  /**
   * Build the org-scoped list filter, applying member-scoping when the viewer
   * is not org-wide. Returns null when the caller has no accessible projects
   * (→ the caller should short-circuit to an empty list).
   */
  private async buildListFilter(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId: string | undefined,
    viewer: SurveyorViewer | undefined,
  ): Promise<Record<string, unknown> | null> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };

    if (viewer && !viewer.orgWide && !isSuperAdmin) {
      const restrictIds = await this.memberProjectIds(organizationId, viewer.userId);
      if (restrictIds.length === 0) return null;
      this.applyProjectScope(filter, projectId, restrictIds);
    } else if (projectId) {
      filter.projectId = projectId;
    }
    return filter;
  }

  async findAllBoq(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
    viewer?: SurveyorViewer,
  ): Promise<any[]> {
    const filter = await this.buildListFilter(organizationId, isSuperAdmin, projectId, viewer);
    if (filter === null) return [];
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

  async findAllVariations(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
    viewer?: SurveyorViewer,
  ): Promise<any[]> {
    const filter = await this.buildListFilter(organizationId, isSuperAdmin, projectId, viewer);
    if (filter === null) return [];
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

    // Explicit field assignment only — never `status`/`approvedById`/`approvedAt`.
    // Status transitions are owned by approveVariation (guards the prior state).
    if (dto.title !== undefined) variation.title = dto.title;
    if (dto.description !== undefined) variation.description = dto.description ?? null;
    if (dto.impactAmount !== undefined) variation.impactAmount = dto.impactAmount;

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

  async findAllValuations(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
    viewer?: SurveyorViewer,
  ): Promise<any[]> {
    const filter = await this.buildListFilter(organizationId, isSuperAdmin, projectId, viewer);
    if (filter === null) return [];
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

    // Explicit assignment only — status is transition-guarded, never blindly copied.
    if (dto.amountUsd !== undefined) valuation.amountUsd = dto.amountUsd;
    if (dto.retentionUsd !== undefined) valuation.retentionUsd = dto.retentionUsd;
    if (dto.status !== undefined) {
      assertStatusTransition('valuation', valuation.status, dto.status, VALUATION_TRANSITIONS);
      valuation.status = dto.status;
    }

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
