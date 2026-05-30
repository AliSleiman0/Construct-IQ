import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';
import { InspectionType, InspectionStatus } from '../../../common/enums';

export type InspectionDocument = CuidHydratedDocument<Inspection>;

/**
 * Thin v1 inspection record: schedule + type + an overall status that doubles as
 * the outcome (SCHEDULED → PASSED/FAILED/CANCELLED). Deliberately NO per-item
 * checklist, photos, or formal sign-off — those are SME-gated and deferred.
 */
@Schema({ collection: 'inspections', timestamps: true })
export class Inspection {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({
    type: String,
    enum: Object.values(InspectionType),
    default: InspectionType.GENERAL,
    index: true,
  })
  type: InspectionType;

  @Prop({
    type: String,
    enum: Object.values(InspectionStatus),
    default: InspectionStatus.SCHEDULED,
    index: true,
  })
  status: InspectionStatus;

  @Prop({ type: Date, default: null })
  scheduledFor: Date | null;

  @Prop({ type: String, ref: 'User', default: null, index: true })
  inspectorId: string | null;

  @Prop({ type: String, default: null })
  location: string | null;

  @Prop({ type: String, default: null })
  notes: string | null;

  @Prop({ type: String, ref: 'User', default: null })
  createdById: string | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const InspectionSchema = SchemaFactory.createForClass(Inspection);

InspectionSchema.plugin(softDeletePlugin);
InspectionSchema.index({ organizationId: 1, projectId: 1, status: 1 });
