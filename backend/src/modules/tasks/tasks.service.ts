import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from '../projects/schemas/task.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AddTaskCommentDto } from './dto/add-task-comment.dto';
import { TaskStatus } from '../../common/enums';

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
  ) {}

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
  ): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const task = await this.taskModel.findOne(filter);
    if (!task) throw new NotFoundException('Task not found');

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
