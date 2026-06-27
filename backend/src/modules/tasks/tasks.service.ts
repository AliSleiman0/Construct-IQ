import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { Task, TaskDocument } from '../projects/schemas/task.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AddTaskCommentDto } from './dto/add-task-comment.dto';
import { TaskStatus } from '../../common/enums';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Who is asking. When `orgWide` is false the caller only sees tasks for the
 * projects they belong to (field roles); when true they see the whole org.
 */
export interface TaskViewer {
  userId: string;
  orgWide: boolean;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Fire-and-forget audit write — a logging failure must never break the op. */
  private audit(entry: Parameters<AuditService['log']>[0]): void {
    this.auditService.log(entry).catch(() => undefined);
  }

  /** Fire-and-forget notification fan-out — a delivery failure must never break the op. */
  private notify(
    organizationId: string,
    userIds: (string | null | undefined)[],
    payload: Parameters<NotificationsService['notifyMany']>[2],
  ): void {
    this.notificationsService.notifyMany(organizationId, userIds, payload).catch(() => undefined);
  }

  /**
   * Daily sweep: alert the assignee of every task that is past its due date and
   * still open. Each task is alerted once — `overdueNotifiedAt` is stamped so a
   * later run never re-notifies. The soft-delete plugin already excludes deleted
   * tasks from the query. Returns the count for logging/tests.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async notifyOverdueTasks(): Promise<{ notified: number }> {
    const now = new Date();
    const overdue = await this.taskModel
      .find({
        dueDate: { $ne: null, $lt: now },
        status: { $ne: TaskStatus.DONE },
        overdueNotifiedAt: null,
      })
      .select('_id title organizationId assignedToId')
      .lean();
    if (overdue.length === 0) return { notified: 0 };

    for (const t of overdue as any[]) {
      this.notify(t.organizationId, [t.assignedToId], {
        title: 'Task overdue',
        message: `Task "${t.title}" is past its due date.`,
        type: 'warning',
        entityType: 'TASK',
        entityId: t._id,
      });
    }
    await this.taskModel.updateMany(
      { _id: { $in: overdue.map((t: any) => t._id) } },
      { overdueNotifiedAt: now },
    );
    return { notified: overdue.length };
  }

  /** Project ids the user is a member of, within their org. */
  private async memberProjectIds(organizationId: string, userId: string): Promise<string[]> {
    const projects = await this.projectModel
      .find({ organizationId, 'members.userId': userId })
      .select('_id')
      .lean();
    return projects.map((p: any) => String(p._id));
  }

  private flattenUser(
    u: any,
  ): { id: string; firstName: string; lastName: string } | null {
    if (!u || typeof u !== 'object') return null;
    return { id: u._id, firstName: u.firstName, lastName: u.lastName };
  }

  /**
   * Flattens a populated, lean Task doc: keeps the raw id fields and adds a
   * `comments[].author` object (mirrors IssuesService.mapIssue). Only the
   * detail endpoint populates comment authors, so the list stays lean.
   */
  private mapTask(doc: any): any {
    if (!doc) return doc;
    return {
      ...doc,
      id: doc._id,
      comments: (doc.comments ?? []).map((c: any) => ({
        ...c,
        id: c._id,
        authorId:
          this.flattenUser(c.authorId)?.id ??
          (typeof c.authorId === 'string' ? c.authorId : null),
        author: this.flattenUser(c.authorId),
      })),
    };
  }

  async findAll(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
    assignedToId?: string,
    status?: TaskStatus,
    viewer?: TaskViewer,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;
    if (assignedToId) filter.assignedToId = assignedToId;
    if (status) filter.status = status;

    if (viewer && !viewer.orgWide && !isSuperAdmin) {
      const restrictIds = await this.memberProjectIds(organizationId, viewer.userId);
      if (restrictIds.length === 0) return [];
      // Honour an explicit project filter only if the caller is a member.
      filter.projectId =
        projectId && restrictIds.includes(projectId)
          ? projectId
          : projectId
            ? { $in: [] }
            : { $in: restrictIds };
    }

    return this.taskModel.find(filter).sort({ position: 1, createdAt: -1 }).lean();
  }

  async findById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const task = await this.taskModel
      .findOne(filter)
      .populate({ path: 'comments.authorId', select: 'firstName lastName' })
      .lean();
    if (!task) throw new NotFoundException('Task not found');
    return this.mapTask(task);
  }

  async create(
    organizationId: string,
    createdById: string,
    dto: CreateTaskDto,
  ): Promise<any> {
    return this.taskModel.create({
      organizationId,
      createdById,
      projectId: dto.projectId,
      phaseId: dto.phaseId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? TaskStatus.TODO,
      priority: dto.priority,
      assignedToId: dto.assignedToId ?? null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      estimatedHours: dto.estimatedHours ?? null,
      dependsOnTaskIds: dto.dependsOnTaskIds ?? [],
    });
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateTaskDto,
    isSuperAdmin: boolean,
    actorUserId?: string,
  ): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const task = await this.taskModel.findOne(filter);
    if (!task) throw new NotFoundException('Task not found');

    const prevStatus = task.status;

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description ?? null;
    if (dto.phaseId !== undefined) task.phaseId = dto.phaseId ?? null;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.assignedToId !== undefined) task.assignedToId = dto.assignedToId ?? null;
    if (dto.startDate !== undefined)
      task.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.dueDate !== undefined)
      task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.estimatedHours !== undefined) task.estimatedHours = dto.estimatedHours ?? null;
    if (dto.actualHours !== undefined) task.actualHours = dto.actualHours ?? null;
    if (dto.progress !== undefined) task.progress = dto.progress;
    if (dto.dependsOnTaskIds !== undefined) task.dependsOnTaskIds = dto.dependsOnTaskIds;

    if (dto.status === 'DONE' && !task.completedAt) {
      task.completedAt = new Date();
    } else if (dto.status && dto.status !== 'DONE') {
      task.completedAt = null;
    }

    await task.save();

    if (dto.status !== undefined && dto.status !== prevStatus) {
      const done = task.status === TaskStatus.DONE;
      this.audit({
        organizationId: task.organizationId,
        actorUserId,
        projectId: task.projectId,
        action: 'UPDATE',
        entityType: 'TASK',
        entityId: task._id,
        metadata: { field: 'status', from: prevStatus, to: task.status },
      });
      this.notify(task.organizationId, [task.createdById, task.assignedToId].filter((u) => u !== actorUserId), {
        title: done ? 'Task completed' : 'Task status changed',
        message: `Task "${task.title}" is now ${task.status}.`,
        type: done ? 'success' : 'info',
        entityType: 'TASK',
        entityId: task._id,
      });
    }

    return task.toObject();
  }

  /**
   * Persist the order of a Kanban column. `taskIds` is the column's full ordered list;
   * each task gets `position = index` and `status`. Also commits a cross-column drop (the
   * moved card's status changes here). `completedAt` is reconciled for the whole column:
   * entering DONE stamps it only where unset (so reordering within DONE never clobbers an
   * existing completion time); any non-DONE column clears it.
   */
  async reorder(
    organizationId: string,
    isSuperAdmin: boolean,
    status: TaskStatus,
    taskIds: string[],
  ): Promise<{ updated: number }> {
    const orgFilter = isSuperAdmin ? {} : { organizationId };

    const ops = taskIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, ...orgFilter },
        update: { $set: { position: index, status } },
      },
    }));
    const res = await this.taskModel.bulkWrite(ops);

    if (status === TaskStatus.DONE) {
      await this.taskModel.updateMany(
        { _id: { $in: taskIds }, ...orgFilter, completedAt: null },
        { $set: { completedAt: new Date() } },
      );
    } else {
      await this.taskModel.updateMany(
        { _id: { $in: taskIds }, ...orgFilter },
        { $set: { completedAt: null } },
      );
    }

    return { updated: res.modifiedCount ?? taskIds.length };
  }

  async assign(
    id: string,
    organizationId: string,
    assignedToId: string,
    isSuperAdmin: boolean,
  ): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const task = await this.taskModel.findOne(filter);
    if (!task) throw new NotFoundException('Task not found');
    task.assignedToId = assignedToId;
    await task.save();
    return task.toObject();
  }

  async addComment(
    id: string,
    organizationId: string,
    authorId: string,
    dto: AddTaskCommentDto,
    isSuperAdmin: boolean,
  ): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const task = await this.taskModel.findOne(filter);
    if (!task) throw new NotFoundException('Task not found');

    task.comments.push({ authorId, body: dto.body } as any);
    await task.save();

    this.audit({
      organizationId: task.organizationId,
      actorUserId: authorId,
      projectId: task.projectId,
      action: 'COMMENT',
      entityType: 'TASK',
      entityId: task._id,
    });
    this.notify(task.organizationId, [task.createdById, task.assignedToId].filter((u) => u !== authorId), {
      title: 'New comment on task',
      message: `A comment was added to "${task.title}".`,
      type: 'info',
      entityType: 'TASK',
      entityId: task._id,
    });

    return task.comments[task.comments.length - 1];
  }

  async softDelete(
    id: string,
    organizationId: string,
    isSuperAdmin: boolean,
  ): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const task = await this.taskModel.findOne(filter);
    if (!task) throw new NotFoundException('Task not found');
    await this.taskModel.updateOne({ _id: id }, { deletedAt: new Date() });
    // Referential integrity: drop this task from sibling dependency lists.
    await this.taskModel.updateMany(
      { dependsOnTaskIds: id },
      { $pull: { dependsOnTaskIds: id } },
    );
    return { message: 'Task deleted successfully' };
  }
}
