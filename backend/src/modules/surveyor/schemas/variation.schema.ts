import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';

export enum VariationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export type VariationDocument = CuidHydratedDocument<Variation>;

@Schema({ collection: 'variations', timestamps: true })
export class Variation {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, default: null })
  description: string | null;

  // Positive = addition to contract, negative = deduction
  @Prop({ type: Number, required: true })
  impactAmount: number;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({
    type: String,
    enum: Object.values(VariationStatus),
    default: VariationStatus.PENDING,
    index: true,
  })
  status: VariationStatus;

  // The user who raised the variation — used to enforce segregation of duties
  // (a creator may not approve their own variation). Null on rows predating #33.
  @Prop({ type: String, ref: 'User', default: null })
  createdById: string | null;

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

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const VariationSchema = SchemaFactory.createForClass(Variation);

VariationSchema.plugin(softDeletePlugin);
VariationSchema.index({ projectId: 1, status: 1 });
