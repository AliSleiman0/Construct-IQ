import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';

export enum ValuationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  CERTIFIED = 'CERTIFIED',
}

export type ValuationDocument = CuidHydratedDocument<Valuation>;

@Schema({ collection: 'valuations', timestamps: true })
export class Valuation {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  // Billing period label e.g. "April 2026", "Q2 2026"
  @Prop({ type: String, required: true })
  period: string;

  @Prop({ type: Number, required: true, min: 0 })
  amountUsd: number;

  // Retention withheld this period — typically a fixed % of amountUsd
  @Prop({ type: Number, default: 0, min: 0 })
  retentionUsd: number;

  @Prop({
    type: String,
    enum: Object.values(ValuationStatus),
    default: ValuationStatus.DRAFT,
    index: true,
  })
  status: ValuationStatus;

  @Prop({ type: String, ref: 'User', default: null })
  certifiedById: string | null;

  @Prop({ type: Date, default: null })
  certifiedAt: Date | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ValuationSchema = SchemaFactory.createForClass(Valuation);

ValuationSchema.plugin(softDeletePlugin);
// One valuation per project per period
ValuationSchema.index({ projectId: 1, period: 1 }, { unique: true });
