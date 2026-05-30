import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';
import { RfiStatus, RfiDiscipline } from '../../../common/enums';

export type RfiDocument = CuidHydratedDocument<Rfi>;

/**
 * Thin v1 Request For Information: a formal question (raised by a site engineer)
 * directed to a respondent with a due-by date, answered by a manager. Deliberately
 * NO drawing/spec references, cost/schedule impact, approval, or distribution
 * lists — those are SME-gated and deferred. `number` is a human-readable per-org
 * identifier (RFI-0001…).
 */
@Schema({ collection: 'rfis', timestamps: true })
export class Rfi {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  @Prop({ type: String, required: true })
  number: string;

  @Prop({ type: String, required: true })
  subject: string;

  @Prop({ type: String, required: true })
  question: string;

  @Prop({
    type: String,
    enum: Object.values(RfiDiscipline),
    default: RfiDiscipline.GENERAL,
    index: true,
  })
  discipline: RfiDiscipline;

  @Prop({
    type: String,
    enum: Object.values(RfiStatus),
    default: RfiStatus.OPEN,
    index: true,
  })
  status: RfiStatus;

  // "Ball in court" — who is expected to answer.
  @Prop({ type: String, ref: 'User', default: null, index: true })
  respondentId: string | null;

  @Prop({ type: Date, default: null })
  dueBy: Date | null;

  @Prop({ type: String, default: null })
  answer: string | null;

  @Prop({ type: String, ref: 'User', default: null })
  answeredById: string | null;

  @Prop({ type: Date, default: null })
  answeredAt: Date | null;

  @Prop({ type: String, ref: 'User', default: null })
  createdById: string | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const RfiSchema = SchemaFactory.createForClass(Rfi);

RfiSchema.plugin(softDeletePlugin);
RfiSchema.index({ organizationId: 1, projectId: 1, status: 1 });
