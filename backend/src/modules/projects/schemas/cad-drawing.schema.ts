import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';

export type CadDrawingDocument = CuidHydratedDocument<CadDrawing>;

@Schema({ collection: 'cad_drawings', timestamps: true })
export class CadDrawing {
  _id: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true, unique: true })
  projectId: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, default: null })
  canvasJson: string | null;

  @Prop({ type: Number, default: 1 })
  version: number;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const CadDrawingSchema = SchemaFactory.createForClass(CadDrawing);
CadDrawingSchema.plugin(softDeletePlugin);
