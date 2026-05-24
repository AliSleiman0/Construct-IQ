import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { ProjectStatus } from '../../../common/enums';

export type PhaseDocument = CuidHydratedDocument<Phase>;

@Schema({ collection: 'phases', timestamps: true })
export class Phase {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: Date, default: null })
  startDate: Date | null;

  @Prop({ type: Date, default: null })
  endDate: Date | null;

  @Prop({
    type: String,
    enum: Object.values(ProjectStatus),
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  // Phases this phase depends on (finish-to-start). Cycle prevention is
  // application-level (client guard + renderer visited-set). Defaults [] so
  // existing rows are unaffected.
  @Prop({ type: [String], ref: 'Phase', default: [] })
  dependsOnPhaseIds: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const PhaseSchema = SchemaFactory.createForClass(Phase);
