import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import { PurchaseOrder, PurchaseOrderDocument } from './schemas/purchase-order.schema';
import { Delivery, DeliveryDocument } from './schemas/delivery.schema';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreateDeliveryDto, UpdateDeliveryDto } from './dto/create-delivery.dto';
import { PartialType } from '@nestjs/mapped-types';
import { PurchaseOrderStatus } from '../../common/enums';

class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}

@Injectable()
export class ProcurementService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(Delivery.name) private deliveryModel: Model<DeliveryDocument>,
  ) {}

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

  async findAllDeliveries(organizationId: string, isSuperAdmin: boolean): Promise<any[]> {
    const filter = isSuperAdmin ? {} : { organizationId };
    return this.deliveryModel.find(filter).sort({ createdAt: -1 }).lean();
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
}
