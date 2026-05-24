import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { MilestoneStatus } from '../../../common/enums';

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
    enum: Object.values(MilestoneStatus),
    default: MilestoneStatus.PENDING,
    index: true,
  })
  status: MilestoneStatus;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  percentComplete: number;

  // Flags a key milestone (e.g. Topping out, Handover) — rendered as a large
  // diamond on the timeline. Defaults false so existing rows are unaffected.
  @Prop({ type: Boolean, default: false })
  isMajor: boolean;

  // Milestones this milestone depends on (finish-to-start). Cycle prevention is
  // application-level (client guard + renderer visited-set). Defaults [].
  @Prop({ type: [String], ref: 'Milestone', default: [] })
  dependsOnMilestoneIds: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const MilestoneSchema = SchemaFactory.createForClass(Milestone);

MilestoneSchema.index({ projectId: 1, targetDate: 1 });
