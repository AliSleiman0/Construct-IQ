import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { ProjectStatus } from '../../../common/enums';

export type MilestoneDocument = CuidHydratedDocument<Milestone>;

@Schema({ collection: 'milestones', timestamps: true })
export class Milestone {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  @Prop({ type: String, ref: 'Phase', default: null })
  phaseId: string | null;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: Date, default: null })
  targetDate: Date | null;

  @Prop({ type: Date, default: null })
  completedDate: Date | null;

  @Prop({
    type: String,
    enum: Object.values(ProjectStatus),
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const MilestoneSchema = SchemaFactory.createForClass(Milestone);
