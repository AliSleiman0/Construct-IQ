import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { PaymentStatus } from '../../../common/enums';

export type PaymentDocument = CuidHydratedDocument<Payment>;

@Schema({ collection: 'payments', timestamps: true })
export class Payment {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Unit', required: true, index: true })
  unitId: string;

  // Denormalised from unit.buyerId for fast per-buyer queries without joining Unit
  @Prop({ type: String, ref: 'User', required: true, index: true })
  buyerId: string;

  @Prop({ type: Number, required: true, min: 1 })
  installmentNo: number;

  @Prop({ type: Number, required: true, min: 1 })
  totalInstallments: number;

  // Human label e.g. "Down Payment", "Installment 3 of 12"
  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: Number, required: true, min: 0 })
  amountUsd: number;

  @Prop({ type: Date, required: true, index: true })
  dueDate: Date;

  @Prop({ type: Date, default: null })
  paidAt: Date | null;

  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    index: true,
  })
  status: PaymentStatus;

  // Invoice reference shown on the payment card
  @Prop({ type: String, default: null })
  invoiceNumber: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// One installment number per unit — enforces no duplicate schedule entries
PaymentSchema.index({ unitId: 1, installmentNo: 1 }, { unique: true });
PaymentSchema.index({ buyerId: 1, status: 1 });
