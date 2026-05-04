import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';
import { ProjectStatus } from '../../../common/enums';

export type ProjectDocument = CuidHydratedDocument<Project>;

// Embedded sub-document — replaces the old ProjectMember join collection.
// User details (name, email, avatar) are loaded separately in services that
// need them via User.find({ _id: { $in: memberUserIds } }).
@Schema({ _id: false, timestamps: false })
export class ProjectMember {
  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  // Project-level role override (free-form string, not the global Role).
  @Prop({ type: String, default: null })
  role: string | null;

  @Prop({ type: Date, default: () => new Date() })
  joinedAt: Date;
}

export const ProjectMemberSchema = SchemaFactory.createForClass(ProjectMember);

@Schema({ collection: 'projects', timestamps: true })
export class Project {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, maxlength: 200 })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, default: null, maxlength: 20 })
  code: string | null;

  @Prop({ type: String, default: null })
  location: string | null;

  @Prop({
    type: String,
    enum: Object.values(ProjectStatus),
    default: ProjectStatus.PLANNING,
    index: true,
  })
  status: ProjectStatus;

  @Prop({ type: Date, default: null })
  startDate: Date | null;

  @Prop({ type: Date, default: null })
  endDate: Date | null;

  // Stored as Number for simplicity. Phase 5 (financials) can migrate this to
  // Decimal128 with custom serializers if accounting precision becomes critical.
  @Prop({ type: Number, default: null, min: 0 })
  totalBudget: number | null;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: String, ref: 'User', default: null })
  createdById: string | null;

  @Prop({ type: [ProjectMemberSchema], default: [] })
  members: ProjectMember[];

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.plugin(softDeletePlugin);

ProjectSchema.index({ organizationId: 1, status: 1 });
ProjectSchema.index({ 'members.userId': 1 });
