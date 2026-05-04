import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';
import { IssueStatus, IssueType, IssueSeverity } from '../../../common/enums';

export type IssueDocument = CuidHydratedDocument<Issue>;

@Schema({ collection: 'issues', timestamps: true })
export class Issue {
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
    enum: Object.values(IssueType),
    default: IssueType.GENERAL,
  })
  type: IssueType;

  @Prop({
    type: String,
    enum: Object.values(IssueSeverity),
    default: IssueSeverity.MEDIUM,
    index: true,
  })
  severity: IssueSeverity;

  @Prop({
    type: String,
    enum: Object.values(IssueStatus),
    default: IssueStatus.OPEN,
    index: true,
  })
  status: IssueStatus;

  @Prop({ type: String, ref: 'User', default: null, index: true })
  assignedToId: string | null;

  @Prop({ type: String, ref: 'User', default: null })
  createdById: string | null;

  @Prop({ type: Date, default: null })
  resolvedAt: Date | null;

  @Prop({ type: Date, default: null })
  closedAt: Date | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const IssueSchema = SchemaFactory.createForClass(Issue);

IssueSchema.plugin(softDeletePlugin);
