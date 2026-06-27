import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';
import { MaterialRequestStatus } from '../../../common/enums';

export type MaterialRequestDocument = CuidHydratedDocument<MaterialRequest>;

@Schema({ collection: 'material_requests', timestamps: true })
export class MaterialRequest {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  @Prop({ type: String, ref: 'User', required: true, index: true })
  requestedById: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, default: null })
  category: string | null;

  @Prop({ type: Number, default: null, min: 0 })
  estimatedCost: number | null;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: Date, default: null })
  neededByDate: Date | null;

  @Prop({
    type: String,
    enum: Object.values(MaterialRequestStatus),
    default: MaterialRequestStatus.PENDING,
    index: true,
  })
  status: MaterialRequestStatus;

  @Prop({ type: String, ref: 'User', default: null })
  reviewedById: string | null;

  @Prop({ type: Date, default: null })
  reviewedAt: Date | null;

  @Prop({ type: String, default: null })
  reviewNote: string | null;

  @Prop({ type: String, ref: 'PurchaseOrder', default: null })
  convertedToPOId: string | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const MaterialRequestSchema = SchemaFactory.createForClass(MaterialRequest);

MaterialRequestSchema.plugin(softDeletePlugin);
