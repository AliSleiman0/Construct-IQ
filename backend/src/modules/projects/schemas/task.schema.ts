import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';
import { TaskStatus, TaskPriority } from '../../../common/enums';

export type TaskDocument = CuidHydratedDocument<Task>;

@Schema({ _id: true, timestamps: true })
export class TaskComment {
  _id: string;

  @Prop({ type: String, ref: 'User', required: true })
  authorId: string;

  @Prop({ type: String, required: true })
  body: string;

  createdAt: Date;
  updatedAt: Date;
}

export const TaskCommentSchema = SchemaFactory.createForClass(TaskComment);

@Schema({ collection: 'tasks', timestamps: true })
export class Task {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', required: true, index: true })
  projectId: string;

  @Prop({ type: String, ref: 'Phase', default: null })
  phaseId: string | null;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.TODO,
    index: true,
  })
  status: TaskStatus;

  @Prop({
    type: String,
    enum: Object.values(TaskPriority),
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Prop({ type: String, ref: 'User', default: null, index: true })
  assignedToId: string | null;

  @Prop({ type: String, ref: 'User', default: null })
  createdById: string | null;

  @Prop({ type: Date, default: null })
  startDate: Date | null;

  @Prop({ type: Date, default: null, index: true })
  dueDate: Date | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progress: number;

  // Manual sort order within a Kanban column (per status). Lower = higher in the column.
  // Defaults to 0; ties break on createdAt (newest first), preserving pre-reorder behaviour.
  @Prop({ type: Number, default: 0, index: true })
  position: number;

  @Prop({ type: Number, default: null, min: 0 })
  estimatedHours: number | null;

  @Prop({ type: Number, default: null, min: 0 })
  actualHours: number | null;

  // Replaces the old TaskDependency join collection — a task ID array.
  // Application-level cycle detection should run on write.
  @Prop({ type: [String], ref: 'Task', default: [] })
  dependsOnTaskIds: string[];

  @Prop({ type: [TaskCommentSchema], default: [] })
  comments: TaskComment[];

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

TaskSchema.plugin(softDeletePlugin);

TaskSchema.index({ projectId: 1, status: 1, position: 1 });
TaskSchema.index({ organizationId: 1, projectId: 1 });
