import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';
import { PurchaseOrderStatus } from '../../../common/enums';

export type PurchaseOrderDocument = CuidHydratedDocument<PurchaseOrder>;

// Embedded — PurchaseOrderItem has no independent lifecycle.
@Schema({ _id: false, timestamps: false })
export class PurchaseOrderItem {
  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: Number, required: true, min: 0 })
  quantity: number;

  @Prop({ type: String, default: null })
  unit: string | null;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalPrice: number;

  @Prop({ type: String, default: null })
  notes: string | null;
}

export const PurchaseOrderItemSchema = SchemaFactory.createForClass(PurchaseOrderItem);

@Schema({ collection: 'purchase_orders', timestamps: true })
export class PurchaseOrder {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  @Prop({ type: String, ref: 'Supplier', required: true, index: true })
  supplierId: string;

  @Prop({ type: String, ref: 'BudgetLine', default: null })
  budgetLineId: string | null;

  @Prop({ type: String, required: true })
  poNumber: string;

  @Prop({
    type: String,
    enum: Object.values(PurchaseOrderStatus),
    default: PurchaseOrderStatus.DRAFT,
    index: true,
  })
  status: PurchaseOrderStatus;

  @Prop({ type: Number, default: null, min: 0 })
  totalAmount: number | null;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: Date, required: true })
  orderDate: Date;

  @Prop({ type: Date, default: null, index: true })
  expectedDeliveryDate: Date | null;

  @Prop({ type: String, default: null })
  notes: string | null;

  @Prop({ type: String, ref: 'User', default: null })
  approvedById: string | null;

  @Prop({ type: Date, default: null })
  approvedAt: Date | null;

  @Prop({ type: String, ref: 'User', default: null })
  rejectedById: string | null;

  @Prop({ type: Date, default: null })
  rejectedAt: Date | null;

  @Prop({ type: String, default: null })
  rejectionReason: string | null;

  @Prop({ type: [PurchaseOrderItemSchema], default: [] })
  items: PurchaseOrderItem[];

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);

PurchaseOrderSchema.plugin(softDeletePlugin);
PurchaseOrderSchema.index(
  { organizationId: 1, poNumber: 1 },
  { unique: true },
);
