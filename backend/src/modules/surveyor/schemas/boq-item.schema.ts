import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';

export type BoqItemDocument = CuidHydratedDocument<BoqItem>;

@Schema({ collection: 'boq_items', timestamps: true })
export class BoqItem {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  // Short reference code unique within a project e.g. "C.01.A"
  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  description: string;

  // Unit of measure e.g. "m²", "tonnes", "each"
  @Prop({ type: String, required: true })
  unit: string;

  @Prop({ type: Number, required: true, min: 0 })
  quantity: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitRate: number;

  // Stored for performance — always equals quantity * unitRate; service must enforce this
  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number;

  // Locked items cannot be edited without explicit unlock — protects certified BOQs
  @Prop({ type: Boolean, default: false })
  isLocked: boolean;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const BoqItemSchema = SchemaFactory.createForClass(BoqItem);

BoqItemSchema.plugin(softDeletePlugin);
BoqItemSchema.index({ projectId: 1, code: 1 }, { unique: true });
