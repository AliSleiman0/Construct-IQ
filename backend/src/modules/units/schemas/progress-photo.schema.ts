import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type ProgressPhotoDocument = CuidHydratedDocument<ProgressPhoto>;

@Schema({ collection: 'progress_photos', timestamps: true })
export class ProgressPhoto {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  @Prop({ type: String, ref: 'Milestone', default: null })
  milestoneId: string | null;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, default: null })
  caption: string | null;

  // When the photo was physically taken — may differ from upload time
  @Prop({ type: Date, required: true })
  takenAt: Date;

  @Prop({ type: String, ref: 'User', default: null })
  uploadedById: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const ProgressPhotoSchema = SchemaFactory.createForClass(ProgressPhoto);

ProgressPhotoSchema.index({ projectId: 1, takenAt: -1 });
