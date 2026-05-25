import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';
import { IssueStatus, IssueType, IssueSeverity } from '../../../common/enums';

export type IssueDocument = CuidHydratedDocument<Issue>;

@Schema({ _id: true, timestamps: true })
export class IssueComment {
  _id: string;

  @Prop({ type: String, ref: 'User', required: true })
  authorId: string;

  @Prop({ type: String, required: true })
  body: string;

  createdAt: Date;
  updatedAt: Date;
}

export const IssueCommentSchema = SchemaFactory.createForClass(IssueComment);

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

  @Prop({ type: String, default: null })
  location: string | null;

  @Prop({ type: String, default: null })
  trade: string | null;

  @Prop({ type: String, ref: 'User', default: null, index: true })
  assignedToId: string | null;

  @Prop({ type: String, ref: 'User', default: null })
  createdById: string | null;

  // Optional link back to the inspection whose failure raised this issue (SE-3).
  @Prop({ type: String, ref: 'Inspection', default: null, index: true })
  inspectionId: string | null;

  @Prop({ type: Date, default: null })
  resolvedAt: Date | null;

  @Prop({ type: Date, default: null })
  closedAt: Date | null;

  @Prop({ type: [IssueCommentSchema], default: [] })
  comments: IssueComment[];

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const IssueSchema = SchemaFactory.createForClass(Issue);

IssueSchema.plugin(softDeletePlugin);
IssueSchema.index({ organizationId: 1, projectId: 1, status: 1 });
