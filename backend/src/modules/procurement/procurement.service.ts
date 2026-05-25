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
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import {
  CreateDeliveryDto,
  UpdateDeliveryDto,
  ConfirmDeliveryDto,
} from './dto/create-delivery.dto';
import { PartialType } from '@nestjs/mapped-types';
import { PurchaseOrderStatus, DeliveryStatus } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { seesAllProjects } from '../../common/util/project-scope.util';

class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}

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

    return this.poModel.create({
      organizationId,
      projectId: dto.projectId,
      supplierId: dto.supplierId,
      budgetLineId: dto.budgetLineId ?? null,
      poNumber: dto.poNumber,
      status: dto.status ?? PurchaseOrderStatus.DRAFT,
      totalAmount: dto.totalAmount ?? null,
      currency: dto.currency ?? 'USD',
      orderDate: new Date(dto.orderDate),
      expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
      notes: dto.notes ?? null,
      items: dto.items ?? [],
    });
  }

  async updatePO(id: string, organizationId: string, dto: UpdatePurchaseOrderDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const po = await this.poModel.findOne(filter);
    if (!po) throw new NotFoundException('Purchase order not found');

    if (dto.status !== undefined) po.status = dto.status;
    if (dto.totalAmount !== undefined) po.totalAmount = dto.totalAmount ?? null;
    if (dto.notes !== undefined) po.notes = dto.notes ?? null;
    if (dto.expectedDeliveryDate !== undefined)
      po.expectedDeliveryDate = dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null;
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
    if (dto.status !== undefined) delivery.status = dto.status;
    if (dto.receivedById !== undefined) delivery.receivedById = dto.receivedById ?? null;
    if (dto.notes !== undefined) delivery.notes = dto.notes ?? null;

    await delivery.save();
    return delivery.toObject();
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
    return delivery.toObject();
  }
}
