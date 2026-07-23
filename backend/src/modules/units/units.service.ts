import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Unit, UnitDocument } from './schemas/unit.schema';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { ProgressPhoto, ProgressPhotoDocument } from './schemas/progress-photo.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { CreateUnitDto, CreatePaymentDto, CreateProgressPhotoDto, UpdatePaymentDto } from './dto/create-unit.dto';
import { UnitStatus, PaymentStatus } from '../../common/enums';
import { PartialType } from '@nestjs/mapped-types';

/** Who is asking — when orgWide is false, results are limited to member projects. */
export interface PhotoViewer {
  userId: string;
  orgWide: boolean;
}

/**
 * Who is asking about units and payments.
 *
 * `GET /units` and `GET /payments` are gated on `read:projects`, which CLIENT
 * carries — so org-scoping alone let any buyer enumerate every unit in the
 * building and, by passing `?buyerId=`, read another buyer's payment schedule.
 * `orgWide` comes from `seesAllProjects(...)`, the same helper the issue/report/
 * task list endpoints use, so a restricted caller is narrowed to:
 *
 *   - units they personally own (`buyerId === userId`), plus
 *   - units in projects they are a member of (staff without `manage:projects`).
 *
 * A buyer belongs to no project, so they collapse to "my own units" — which is
 * the whole point. A client-supplied `buyerId` is intersected with this filter,
 * never trusted on its own.
 */
export interface UnitViewer {
  userId: string;
  orgWide: boolean;
}

class UpdateUnitDto extends PartialType(CreateUnitDto) {}

@Injectable()
export class UnitsService {
  constructor(
    @InjectModel(Unit.name) private unitModel: Model<UnitDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(ProgressPhoto.name) private photoModel: Model<ProgressPhotoDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  /**
   * The `$or` branches a restricted caller may match on units: their own
   * purchases, plus anything in a project they staff. Returns null when the
   * caller is unrestricted (super admin, or holds a broad enough `manage:*`).
   */
  private async unitVisibility(
    organizationId: string,
    isSuperAdmin: boolean,
    viewer?: UnitViewer,
  ): Promise<Record<string, unknown>[] | null> {
    if (isSuperAdmin || !viewer || viewer.orgWide) return null;
    const projectIds = await this.memberProjectIds(organizationId, viewer.userId);
    const branches: Record<string, unknown>[] = [{ buyerId: viewer.userId }];
    if (projectIds.length > 0) branches.push({ projectId: { $in: projectIds } });
    return branches;
  }

  /** Unit ids a restricted caller may see, used to scope payments. */
  private async visibleUnitIds(
    organizationId: string,
    branches: Record<string, unknown>[],
  ): Promise<string[]> {
    const units = await this.unitModel
      .find({ organizationId, $or: branches })
      .select('_id')
      .lean();
    return units.map((u: any) => String(u._id));
  }

  /** Project ids the user has bought a unit in, within their org. */
  private async buyerProjectIds(organizationId: string, userId: string): Promise<string[]> {
    const units = await this.unitModel
      .find({ organizationId, buyerId: userId })
      .select('projectId')
      .lean();
    return Array.from(new Set(units.map((u: any) => String(u.projectId))));
  }

  /** Project ids the user is a member of, within their org. */
  private async memberProjectIds(organizationId: string, userId: string): Promise<string[]> {
    const projects = await this.projectModel
      .find({ organizationId, 'members.userId': userId })
      .select('_id')
      .lean();
    return projects.map((p: any) => String(p._id));
  }

  async findAllUnits(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
    status?: UnitStatus,
    viewer?: UnitViewer,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;

    const branches = await this.unitVisibility(organizationId, isSuperAdmin, viewer);
    if (branches) filter.$or = branches;

    return this.unitModel.find(filter).sort({ floor: 1, label: 1 }).lean();
  }

  async findUnitById(
    id: string,
    organizationId: string,
    isSuperAdmin: boolean,
    viewer?: UnitViewer,
  ): Promise<any> {
    const filter: Record<string, unknown> = isSuperAdmin
      ? { _id: id }
      : { _id: id, organizationId };

    // A buyer must 404 on someone else's unit, not read it.
    const branches = await this.unitVisibility(organizationId, isSuperAdmin, viewer);
    if (branches) filter.$or = branches;

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
    // Referential integrity: refuse to orphan recorded payments.
    const payments = await this.paymentModel.countDocuments({ unitId: id });
    if (payments > 0) {
      throw new ConflictException(
        'Cannot delete unit with recorded payments. Remove its payments first.',
      );
    }
    await this.unitModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Unit deleted successfully' };
  }

  async findPayments(
    organizationId: string,
    isSuperAdmin: boolean,
    buyerId?: string,
    unitId?: string,
    viewer?: UnitViewer,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (buyerId) filter.buyerId = buyerId;
    if (unitId) filter.unitId = unitId;

    // The `buyerId` query param is a filter, never an authorization claim: it
    // is intersected with what this caller may see, so passing someone else's
    // id narrows the result rather than widening it.
    const branches = await this.unitVisibility(organizationId, isSuperAdmin, viewer);
    if (branches) {
      const allowedUnitIds = await this.visibleUnitIds(organizationId, branches);
      filter.$or = [
        { buyerId: viewer!.userId },
        ...(allowedUnitIds.length > 0 ? [{ unitId: { $in: allowedUnitIds } }] : []),
      ];
    }

    return this.paymentModel.find(filter).sort({ installmentNo: 1 }).lean();
  }

  /** Sum of existing installment amounts booked against a unit (org-scoped). */
  private async sumPaymentsForUnit(unitId: string, organizationId: string): Promise<number> {
    const [agg] = await this.paymentModel.aggregate([
      { $match: { unitId, organizationId } },
      { $group: { _id: null, total: { $sum: '$amountUsd' } } },
    ]);
    return agg?.total ?? 0;
  }

  async createPayment(organizationId: string, dto: CreatePaymentDto): Promise<any> {
    // Installments may not collectively exceed the unit's sale price.
    const unit = await this.unitModel.findOne({ _id: dto.unitId, organizationId }).lean();
    if (!unit) throw new NotFoundException('Unit not found');
    const existing = await this.sumPaymentsForUnit(dto.unitId, organizationId);
    if (existing + dto.amountUsd > (unit as any).priceUsd) {
      throw new BadRequestException(
        'Payment installments would exceed the unit price',
      );
    }

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
    if (dto.invoiceNumber !== undefined) payment.invoiceNumber = dto.invoiceNumber ?? null;

    // Partial-payment tracking (#36): when an amount received is supplied, derive
    // the status from it — 0 → PENDING, part → PARTIAL, full → PAID (stamping paidAt
    // only on full settlement). An explicit `status` still works for the terminal
    // overrides (OVERDUE / CANCELLED, or a manual full PAID).
    if (dto.paidAmountUsd !== undefined) {
      if (dto.paidAmountUsd > payment.amountUsd) {
        throw new BadRequestException('Paid amount cannot exceed the installment amount');
      }
      payment.paidAmountUsd = dto.paidAmountUsd;
      if (dto.paidAmountUsd <= 0) {
        payment.paidAmountUsd = 0;
        payment.status = PaymentStatus.PENDING;
        payment.paidAt = null;
      } else if (dto.paidAmountUsd < payment.amountUsd) {
        payment.status = PaymentStatus.PARTIAL;
        payment.paidAt = null;
      } else {
        payment.status = PaymentStatus.PAID;
        if (!payment.paidAt) payment.paidAt = new Date();
      }
    } else if (dto.status !== undefined) {
      payment.status = dto.status;
      if (dto.status === PaymentStatus.PAID) {
        payment.paidAmountUsd = payment.amountUsd;
        if (!payment.paidAt) payment.paidAt = new Date();
      }
    }

    await payment.save();
    return payment.toObject();
  }

  async findPhotos(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
    viewer?: PhotoViewer,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;

    if (viewer && !viewer.orgWide && !isSuperAdmin) {
      // Progress photos are project-level, and a buyer is not a project member
      // — so their own units' projects count as visible too. Without this a
      // client sees an empty gallery for the building they bought into.
      const [memberIds, ownedIds] = await Promise.all([
        this.memberProjectIds(organizationId, viewer.userId),
        this.buyerProjectIds(organizationId, viewer.userId),
      ]);
      const restrictIds = Array.from(new Set([...memberIds, ...ownedIds]));
      if (restrictIds.length === 0) return [];
      // Honour an explicit project filter only if the caller is a member.
      filter.projectId =
        projectId && restrictIds.includes(projectId)
          ? projectId
          : projectId
            ? { $in: [] }
            : { $in: restrictIds };
    }

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
