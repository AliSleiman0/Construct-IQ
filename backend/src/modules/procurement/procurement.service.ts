import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import { PurchaseOrder, PurchaseOrderDocument } from './schemas/purchase-order.schema';
import { Delivery, DeliveryDocument } from './schemas/delivery.schema';
import { MaterialRequest, MaterialRequestDocument } from './schemas/material-request.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import {
  CreateDeliveryDto,
  UpdateDeliveryDto,
  ConfirmDeliveryDto,
} from './dto/create-delivery.dto';
import { CreateMaterialRequestDto, ReviewMaterialRequestDto, ConvertMaterialRequestDto } from './dto/create-material-request.dto';
import { PartialType } from '@nestjs/mapped-types';
import { PurchaseOrderStatus, MaterialRequestStatus, DeliveryStatus } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { seesAllProjects } from '../../common/util/project-scope.util';
import { assertStatusTransition, TransitionMap } from '../../common/util/status-transition.util';
import { AuditService } from '../audit/audit.service';

class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}

// Self-service PO transitions via the generic update. APPROVED/REJECTED are
// dedicated-only (approvePO/rejectPO stamp approvedById/rejectedById).
const PO_TRANSITIONS: TransitionMap<PurchaseOrderStatus> = {
  [PurchaseOrderStatus.DRAFT]: [PurchaseOrderStatus.SUBMITTED, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.SUBMITTED]: [PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.APPROVED]: [PurchaseOrderStatus.DELIVERED, PurchaseOrderStatus.CANCELLED],
};

// Self-service delivery transitions. DELIVERED is dedicated-only (confirmDelivery
// stamps receivedById = caller and enforces the project member-gate).
const DELIVERY_TRANSITIONS: TransitionMap<DeliveryStatus> = {
  [DeliveryStatus.PENDING]: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELAYED, DeliveryStatus.CANCELLED],
  [DeliveryStatus.IN_TRANSIT]: [DeliveryStatus.DELAYED, DeliveryStatus.CANCELLED],
  [DeliveryStatus.DELAYED]: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.CANCELLED],
};

// #30 — a PO's expected delivery can't precede its order date, nor be set to a
// date already in the past (start-of-today, so "today" is still acceptable).
export function assertDeliveryDateSane(orderDate: Date, expectedDeliveryDate: Date): void {
  if (expectedDeliveryDate < orderDate) {
    throw new BadRequestException('Expected delivery date cannot be before the order date');
  }
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (expectedDeliveryDate < startOfToday) {
    throw new BadRequestException('Expected delivery date cannot be in the past');
  }
}

/** Who is asking — when orgWide is false, results are limited to member projects. */
export interface DeliveryViewer {
  userId: string;
  orgWide: boolean;
}

@Injectable()
export class ProcurementService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(Delivery.name) private deliveryModel: Model<DeliveryDocument>,
    @InjectModel(MaterialRequest.name) private materialRequestModel: Model<MaterialRequestDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private readonly auditService: AuditService,
  ) {}

  /** Fire-and-forget audit write — a logging failure must never break the op. */
  private audit(entry: Parameters<AuditService['log']>[0]): void {
    this.auditService.log(entry).catch(() => undefined);
  }

  /** Project ids the user is a member of, within their org. */
  private async memberProjectIds(organizationId: string, userId: string): Promise<string[]> {
    const projects = await this.projectModel
      .find({ organizationId, 'members.userId': userId })
      .select('_id')
      .lean();
    return projects.map((p: any) => String(p._id));
  }

  /** PO ids belonging to the given org-scoped project ids. */
  private async poIdsForProjects(organizationId: string, projectIds: string[]): Promise<string[]> {
    const pos = await this.poModel
      .find({ organizationId, projectId: { $in: projectIds } })
      .select('_id')
      .lean();
    return pos.map((p: any) => String(p._id));
  }

  /**
   * Attach each delivery's PO number + projectId so consumers can identify and
   * project-filter deliveries WITHOUT holding read:purchase_orders (site engineers
   * have read:deliveries only). The join comes through the authorized endpoint.
   */
  private async enrichDeliveriesWithPo(deliveries: any[]): Promise<any[]> {
    if (deliveries.length === 0) return deliveries;
    const poIds = [...new Set(deliveries.map((d) => String(d.purchaseOrderId)))];
    const pos = await this.poModel.find({ _id: { $in: poIds } }).select('poNumber projectId').lean();
    const byId = new Map(pos.map((p: any) => [String(p._id), p]));
    return deliveries.map((d) => {
      const po = byId.get(String(d.purchaseOrderId));
      return { ...d, poNumber: po?.poNumber ?? null, projectId: po?.projectId ?? null };
    });
  }

  // ── Suppliers ──────────────────────────────────────────────────────────────

  async findAllSuppliers(organizationId: string, isSuperAdmin: boolean): Promise<any[]> {
    const filter = isSuperAdmin ? {} : { organizationId };
    return this.supplierModel.find(filter).sort({ name: 1 }).lean();
  }

  async findSupplierById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const supplier = await this.supplierModel.findOne(filter).lean();
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async createSupplier(organizationId: string, dto: CreateSupplierDto): Promise<any> {
    return this.supplierModel.create({
      organizationId,
      name: dto.name,
      contactName: dto.contactName ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      taxId: dto.taxId ?? null,
      website: dto.website ?? null,
      notes: dto.notes ?? null,
      isActive: true,
    });
  }

  async updateSupplier(id: string, organizationId: string, dto: UpdateSupplierDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const supplier = await this.supplierModel.findOne(filter);
    if (!supplier) throw new NotFoundException('Supplier not found');
    Object.assign(supplier, dto);
    await supplier.save();
    return supplier.toObject();
  }

  async deleteSupplier(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const supplier = await this.supplierModel.findOne(filter);
    if (!supplier) throw new NotFoundException('Supplier not found');
    // Referential integrity: refuse to orphan live purchase orders.
    const pos = await this.poModel.countDocuments({ supplierId: id });
    if (pos > 0) {
      throw new ConflictException(
        'Cannot delete supplier with active purchase orders. Cancel or reassign them first.',
      );
    }
    await this.supplierModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Supplier deleted successfully' };
  }

  // ── Purchase Orders ────────────────────────────────────────────────────────

  async findAllPOs(organizationId: string, isSuperAdmin: boolean, projectId?: string): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;
    return this.poModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async findPOById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const po = await this.poModel.findOne(filter).lean();
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async createPO(organizationId: string, dto: CreatePurchaseOrderDto): Promise<any> {
    const existing = await this.poModel.findOne({ organizationId, poNumber: dto.poNumber });
    if (existing) throw new ConflictException('PO number already exists in this organization');

    const orderDate = new Date(dto.orderDate);
    if (dto.expectedDeliveryDate) {
      assertDeliveryDateSane(orderDate, new Date(dto.expectedDeliveryDate));
    }

    return this.poModel.create({
      organizationId,
      projectId: dto.projectId,
      supplierId: dto.supplierId,
      budgetLineId: dto.budgetLineId ?? null,
      poNumber: dto.poNumber,
      status: dto.status ?? PurchaseOrderStatus.DRAFT,
      // Honored only when there are no line items (lump-sum PO). When items are
      // present, the schema pre-save hook (applyPoTotals) recomputes this from them.
      totalAmount: dto.totalAmount ?? null,
      currency: dto.currency ?? 'USD',
      orderDate,
      expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
      notes: dto.notes ?? null,
      items: dto.items ?? [],
    });
  }

  async updatePO(id: string, organizationId: string, dto: UpdatePurchaseOrderDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const po = await this.poModel.findOne(filter);
    if (!po) throw new NotFoundException('Purchase order not found');

    if (dto.status !== undefined) {
      // APPROVED/REJECTED go through approvePO/rejectPO only — guard self-service moves.
      assertStatusTransition('purchase order', po.status, dto.status, PO_TRANSITIONS);
      po.status = dto.status;
    }
    // Accepted for the lump-sum (no-items) case; overridden by the pre-save hook
    // (applyPoTotals) whenever line items are present.
    if (dto.totalAmount !== undefined) po.totalAmount = dto.totalAmount ?? null;
    if (dto.notes !== undefined) po.notes = dto.notes ?? null;
    if (dto.expectedDeliveryDate !== undefined) {
      if (dto.expectedDeliveryDate) {
        // orderDate is immutable post-create, so validate against the stored value.
        assertDeliveryDateSane(po.orderDate, new Date(dto.expectedDeliveryDate));
      }
      po.expectedDeliveryDate = dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null;
    }
    if (dto.items !== undefined) po.items = dto.items as any;

    await po.save();
    return po.toObject();
  }

  async approvePO(id: string, organizationId: string, approvedById: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const po = await this.poModel.findOne(filter);
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PurchaseOrderStatus.SUBMITTED) {
      throw new BadRequestException('Only SUBMITTED purchase orders can be approved');
    }

    po.status = PurchaseOrderStatus.APPROVED;
    po.approvedById = approvedById;
    po.approvedAt = new Date();
    await po.save();

    this.audit({
      organizationId: po.organizationId,
      actorUserId: approvedById,
      projectId: po.projectId,
      action: 'APPROVE',
      entityType: 'PURCHASE_ORDER',
      entityId: po._id,
      metadata: { from: PurchaseOrderStatus.SUBMITTED, to: PurchaseOrderStatus.APPROVED },
    });
    return po.toObject();
  }

  async rejectPO(id: string, organizationId: string, rejectedById: string, reason: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const po = await this.poModel.findOne(filter);
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PurchaseOrderStatus.SUBMITTED) {
      throw new BadRequestException('Only SUBMITTED purchase orders can be rejected');
    }

    po.status = PurchaseOrderStatus.REJECTED;
    po.rejectedById = rejectedById;
    po.rejectedAt = new Date();
    po.rejectionReason = reason ?? null;
    await po.save();

    this.audit({
      organizationId: po.organizationId,
      actorUserId: rejectedById,
      projectId: po.projectId,
      action: 'REJECT',
      entityType: 'PURCHASE_ORDER',
      entityId: po._id,
      metadata: { to: PurchaseOrderStatus.REJECTED, reason: reason ?? null },
    });
    return po.toObject();
  }

  async deletePO(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const po = await this.poModel.findOne(filter);
    if (!po) throw new NotFoundException('Purchase order not found');
    await this.poModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Purchase order deleted successfully' };
  }

  // ── Deliveries ─────────────────────────────────────────────────────────────

  async findAllDeliveries(
    organizationId: string,
    isSuperAdmin: boolean,
    viewer?: DeliveryViewer,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };

    // Field roles (no manage:deliveries) only see deliveries for POs on their
    // member projects — deliveries have no direct projectId, so resolve via PO.
    if (viewer && !viewer.orgWide && !isSuperAdmin) {
      const restrictIds = await this.memberProjectIds(organizationId, viewer.userId);
      if (restrictIds.length === 0) return [];
      const poIds = await this.poIdsForProjects(organizationId, restrictIds);
      if (poIds.length === 0) return [];
      filter.purchaseOrderId = { $in: poIds };
    }

    const deliveries = await this.deliveryModel.find(filter).sort({ createdAt: -1 }).lean();
    return this.enrichDeliveriesWithPo(deliveries);
  }

  async findDeliveryById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const delivery = await this.deliveryModel.findOne(filter).lean();
    if (!delivery) throw new NotFoundException('Delivery not found');
    return delivery;
  }

  async createDelivery(organizationId: string, dto: CreateDeliveryDto): Promise<any> {
    return this.deliveryModel.create({
      organizationId,
      purchaseOrderId: dto.purchaseOrderId,
      deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
      status: dto.status,
      notes: dto.notes ?? null,
    });
  }

  async updateDelivery(id: string, organizationId: string, dto: UpdateDeliveryDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const delivery = await this.deliveryModel.findOne(filter);
    if (!delivery) throw new NotFoundException('Delivery not found');

    if (dto.deliveryDate !== undefined)
      delivery.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : null;
    if (dto.status !== undefined) {
      // DELIVERED goes through confirmDelivery only (it stamps receivedById = caller
      // and enforces the project member-gate). receivedById is no longer client-settable.
      assertStatusTransition('delivery', delivery.status, dto.status, DELIVERY_TRANSITIONS);
      delivery.status = dto.status;
    }
    if (dto.notes !== undefined) delivery.notes = dto.notes ?? null;

    await delivery.save();
    return delivery.toObject();
  }

  async deleteDelivery(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const delivery = await this.deliveryModel.findOne(filter);
    if (!delivery) throw new NotFoundException('Delivery not found');
    // Soft-delete for consistency with the rest of the platform (was a hard delete).
    await this.deliveryModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Delivery deleted successfully' };
  }

  // ── Material Requests ──────────────────────────────────────────────────────

  async findAllMaterialRequests(organizationId: string, isSuperAdmin: boolean, projectId?: string): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;
    return this.materialRequestModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async findMaterialRequestById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const mr = await this.materialRequestModel.findOne(filter).lean();
    if (!mr) throw new NotFoundException('Material request not found');
    return mr;
  }

  async createMaterialRequest(organizationId: string, requestedById: string, dto: CreateMaterialRequestDto): Promise<any> {
    return this.materialRequestModel.create({
      organizationId,
      requestedById,
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description ?? null,
      category: dto.category ?? null,
      estimatedCost: dto.estimatedCost ?? null,
      currency: dto.currency ?? 'USD',
      neededByDate: dto.neededByDate ? new Date(dto.neededByDate) : null,
      status: MaterialRequestStatus.PENDING,
    });
  }

  async updateMaterialRequest(id: string, organizationId: string, dto: Partial<CreateMaterialRequestDto>, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const mr = await this.materialRequestModel.findOne(filter);
    if (!mr) throw new NotFoundException('Material request not found');
    if (mr.status !== MaterialRequestStatus.PENDING) {
      throw new BadRequestException('Only PENDING material requests can be edited');
    }

    if (dto.title !== undefined) mr.title = dto.title;
    if (dto.description !== undefined) mr.description = dto.description ?? null;
    if (dto.category !== undefined) mr.category = dto.category ?? null;
    if (dto.estimatedCost !== undefined) mr.estimatedCost = dto.estimatedCost ?? null;
    if (dto.currency !== undefined) mr.currency = dto.currency ?? 'USD';
    if (dto.neededByDate !== undefined) mr.neededByDate = dto.neededByDate ? new Date(dto.neededByDate) : null;

    await mr.save();
    return mr.toObject();
  }

  async approveMaterialRequest(id: string, organizationId: string, reviewedById: string, dto: ReviewMaterialRequestDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const mr = await this.materialRequestModel.findOne(filter);
    if (!mr) throw new NotFoundException('Material request not found');
    if (mr.status !== MaterialRequestStatus.PENDING) {
      throw new BadRequestException('Only PENDING material requests can be approved');
    }
    // Segregation of duties: the requester may not approve their own request
    // (Super Admins are exempt). #33
    if (!isSuperAdmin && mr.requestedById && mr.requestedById === reviewedById) {
      throw new ForbiddenException('You cannot approve a material request you created');
    }

    mr.status = MaterialRequestStatus.APPROVED;
    mr.reviewedById = reviewedById;
    mr.reviewedAt = new Date();
    mr.reviewNote = dto.reviewNote ?? null;
    await mr.save();

    this.audit({
      organizationId: mr.organizationId,
      actorUserId: reviewedById,
      projectId: mr.projectId,
      action: 'APPROVE',
      entityType: 'MATERIAL_REQUEST',
      entityId: mr._id,
      metadata: { to: MaterialRequestStatus.APPROVED },
    });
    return mr.toObject();
  }

  async rejectMaterialRequest(id: string, organizationId: string, reviewedById: string, dto: ReviewMaterialRequestDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const mr = await this.materialRequestModel.findOne(filter);
    if (!mr) throw new NotFoundException('Material request not found');
    if (mr.status !== MaterialRequestStatus.PENDING) {
      throw new BadRequestException('Only PENDING material requests can be rejected');
    }

    mr.status = MaterialRequestStatus.REJECTED;
    mr.reviewedById = reviewedById;
    mr.reviewedAt = new Date();
    mr.reviewNote = dto.reviewNote ?? null;
    await mr.save();

    this.audit({
      organizationId: mr.organizationId,
      actorUserId: reviewedById,
      projectId: mr.projectId,
      action: 'REJECT',
      entityType: 'MATERIAL_REQUEST',
      entityId: mr._id,
      metadata: { to: MaterialRequestStatus.REJECTED },
    });
    return mr.toObject();
  }

  async convertMaterialRequestToPO(id: string, organizationId: string, dto: ConvertMaterialRequestDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const mr = await this.materialRequestModel.findOne(filter);
    if (!mr) throw new NotFoundException('Material request not found');
    if (mr.status !== MaterialRequestStatus.APPROVED) {
      throw new BadRequestException('Only APPROVED material requests can be converted to a PO');
    }

    const po = await this.poModel.findOne(isSuperAdmin ? { _id: dto.poId } : { _id: dto.poId, organizationId }).lean();
    if (!po) throw new NotFoundException('Purchase order not found');

    mr.status = MaterialRequestStatus.CONVERTED;
    mr.convertedToPOId = dto.poId;
    await mr.save();
    return mr.toObject();
  }

  async deleteMaterialRequest(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const mr = await this.materialRequestModel.findOne(filter);
    if (!mr) throw new NotFoundException('Material request not found');
    // Soft-delete for consistency with the rest of the platform (was a hard delete).
    await this.materialRequestModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Material request deleted successfully' };
  }

  // ── Supplier Performance ──────────────────────────────────────────────────

  async getSupplierPerformance(supplierId: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const supplierFilter = isSuperAdmin ? { _id: supplierId } : { _id: supplierId, organizationId };
    const supplier = await this.supplierModel.findOne(supplierFilter).lean();
    if (!supplier) throw new NotFoundException('Supplier not found');

    const orgFilter = isSuperAdmin ? { supplierId } : { supplierId, organizationId };

    const [poStats, deliveryStats] = await Promise.all([
      this.poModel.aggregate([
        { $match: { ...orgFilter, deletedAt: null } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalValue: { $sum: '$totalAmount' },
            deliveredCount: {
              $sum: { $cond: [{ $eq: ['$status', PurchaseOrderStatus.DELIVERED] }, 1, 0] },
            },
          },
        },
      ]),

      // On-time: deliveries where deliveryDate <= PO.expectedDeliveryDate.
      // A delivery can only be judged on-time when it has BOTH an actual
      // deliveryDate and a target expectedDeliveryDate — rows missing either are
      // excluded from the rate entirely (counting null targets as "on-time"
      // would silently inflate the score).
      this.deliveryModel.aggregate([
        { $match: { ...orgFilter, status: 'DELIVERED' } },
        {
          $lookup: {
            from: 'purchase_orders',
            localField: 'purchaseOrderId',
            foreignField: '_id',
            as: 'po',
          },
        },
        { $unwind: '$po' },
        {
          $match: {
            deliveryDate: { $ne: null },
            'po.expectedDeliveryDate': { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            onTime: {
              $sum: {
                $cond: [
                  { $lte: ['$deliveryDate', '$po.expectedDeliveryDate'] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const po = poStats[0] ?? { totalOrders: 0, totalValue: 0, deliveredCount: 0 };
    const dl = deliveryStats[0] ?? { total: 0, onTime: 0 };
    const onTimeRate = dl.total > 0 ? Math.round((dl.onTime / dl.total) * 100) : null;

    return {
      supplierId,
      supplierName: (supplier as any).name,
      totalOrders: po.totalOrders,
      totalValue: po.totalValue ?? 0,
      deliveredOrders: po.deliveredCount,
      deliveriesTracked: dl.total,
      onTimeDeliveries: dl.onTime,
      onTimeRate,
    };
  }

  // ── Procurement Dashboard ──────────────────────────────────────────────────

  async getProcurementDashboard(organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const orgFilter = isSuperAdmin ? {} : { organizationId };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start of current week (Monday)
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      activeSuppliers,
      poStatusCounts,
      monthlySpend,
      pendingDeliveries,
      materialRequestCounts,
      spendByCategory,
      weeklyDeliveries,
    ] = await Promise.all([
      // Active (non-deleted) suppliers
      this.supplierModel.countDocuments({ ...orgFilter, isActive: true, deletedAt: null }),

      // POs grouped by status
      this.poModel.aggregate([
        { $match: { ...orgFilter, deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Total spend this month (APPROVED + DELIVERED POs)
      this.poModel.aggregate([
        {
          $match: {
            ...orgFilter,
            deletedAt: null,
            status: { $in: [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.DELIVERED] },
            orderDate: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),

      // Pending deliveries
      this.deliveryModel.countDocuments({ ...orgFilter, status: 'PENDING' }),

      // Material requests grouped by status
      this.materialRequestModel.aggregate([
        { $match: orgFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Spend by item category (last 30 days, from PO line items)
      this.poModel.aggregate([
        {
          $match: {
            ...orgFilter,
            deletedAt: null,
            status: { $in: [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.DELIVERED] },
            orderDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: '$items.description',
            total: { $sum: '$items.totalPrice' },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 6 },
        { $project: { _id: 0, label: '$_id', value: '$total' } },
      ]),

      // Deliveries per day this week
      this.deliveryModel.aggregate([
        {
          $match: {
            ...orgFilter,
            status: 'DELIVERED',
            deliveryDate: { $gte: startOfWeek },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: '$deliveryDate' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Reshape status counts to a keyed map
    const poByStatus: Record<string, number> = {};
    for (const row of poStatusCounts) poByStatus[row._id] = row.count;

    const mrByStatus: Record<string, number> = {};
    for (const row of materialRequestCounts) mrByStatus[row._id] = row.count;

    // Map Sunday=1…Saturday=7 → Mon-Sun labels
    const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const delivMap: Record<number, number> = {};
    for (const row of weeklyDeliveries) delivMap[row._id] = row.count;
    const deliveriesThisWeek = DAY_LABELS.map((label, i) => ({
      label,
      value: delivMap[(i + 2) % 7 === 0 ? 7 : (i + 2) % 7] ?? 0,
    }));

    return {
      activeSuppliers,
      activePOs: (poByStatus['SUBMITTED'] ?? 0) + (poByStatus['APPROVED'] ?? 0),
      poByStatus,
      monthlySpend: monthlySpend[0]?.total ?? 0,
      pendingDeliveries,
      materialRequests: {
        pending: mrByStatus['PENDING'] ?? 0,
        approved: mrByStatus['APPROVED'] ?? 0,
      },
      spendByCategory: spendByCategory.length ? spendByCategory : [],
      deliveriesThisWeek,
    };
  }

  /**
   * Goods-received confirmation (SE-7). Narrow, least-privilege action: forces
   * status=DELIVERED and receivedById=current user. Field roles may only confirm
   * deliveries for POs on a project they're a member of (member-gate), so a
   * guessed id on another project is rejected even with confirm:deliveries.
   */
  async confirmDelivery(id: string, user: JwtPayload, dto: ConfirmDeliveryDto): Promise<any> {
    const filter = user.isSuperAdmin ? { _id: id } : { _id: id, organizationId: user.organizationId };
    const delivery = await this.deliveryModel.findOne(filter);
    if (!delivery) throw new NotFoundException('Delivery not found');

    const orgWide = seesAllProjects(user.isSuperAdmin, user.permissions, 'deliveries');
    if (!orgWide && !user.isSuperAdmin) {
      const po = await this.poModel
        .findOne({ _id: delivery.purchaseOrderId, organizationId: user.organizationId })
        .select('projectId')
        .lean();
      const memberIds = await this.memberProjectIds(user.organizationId, user.sub);
      if (!po || !memberIds.includes(String((po as any).projectId))) {
        throw new ForbiddenException('You can only confirm deliveries on your own projects');
      }
    }

    delivery.status = DeliveryStatus.DELIVERED;
    delivery.receivedById = user.sub;
    delivery.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : (delivery.deliveryDate ?? new Date());
    if (dto.notes !== undefined) delivery.notes = dto.notes ?? null;

    await delivery.save();

    this.audit({
      organizationId: delivery.organizationId,
      actorUserId: user.sub,
      action: 'CONFIRM',
      entityType: 'DELIVERY',
      entityId: delivery._id,
      metadata: { purchaseOrderId: delivery.purchaseOrderId, to: DeliveryStatus.DELIVERED },
    });
    return delivery.toObject();
  }
}
