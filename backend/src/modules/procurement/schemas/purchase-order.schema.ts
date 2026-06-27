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

/** Round to 2 decimals, absorbing binary-float dust (0.1 * 3 -> 0.30000000000000004). */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Server-authoritative money invariant for a purchase order.
 *
 * When the PO carries line items, the items are the single source of truth: each
 * item.totalPrice is recomputed as quantity * unitPrice, and the header totalAmount
 * is the sum of those lines. Any client-supplied totalPrice / totalAmount is ignored.
 *
 * When there are NO line items, the manually-entered lump-sum totalAmount is left
 * untouched (header-only POs are still allowed).
 *
 * Pure and idempotent — re-running it on an unchanged PO is a no-op. Exported so it
 * can be unit-tested directly without a live Mongoose connection.
 */
export function applyPoTotals(po: {
  items?: PurchaseOrderItem[] | null;
  totalAmount?: number | null;
}): void {
  if (Array.isArray(po.items) && po.items.length > 0) {
    for (const it of po.items) {
      it.totalPrice = round2((it.quantity || 0) * (it.unitPrice || 0));
    }
    po.totalAmount = round2(po.items.reduce((sum, it) => sum + (it.totalPrice || 0), 0));
  }
  // else: no line items → preserve the manual lump-sum totalAmount as-is
}

// Recompute on every save (create / update / approve / reject all go through .save()),
// so the header total can never drift from the line items regardless of code path.
PurchaseOrderSchema.pre('save', function (next) {
  applyPoTotals(this as unknown as PurchaseOrder);
  next();
});
