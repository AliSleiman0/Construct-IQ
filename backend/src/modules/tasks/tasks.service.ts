import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from '../projects/schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '../../common/enums';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
  ) {}

  async findAll(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
    assignedToId?: string,
    status?: TaskStatus,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) filter.projectId = projectId;
    if (assignedToId) filter.assignedToId = assignedToId;
    if (status) filter.status = status;
    return this.taskModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async findById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const task = await this.taskModel.findOne(filter).lean();
    if (!task) throw new NotFoundException('Task not found');
    return task;
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

  async softDelete(
    id: string,
    organizationId: string,
    isSuperAdmin: boolean,
  ): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const task = await this.taskModel.findOne(filter);
    if (!task) throw new NotFoundException('Task not found');
    await this.taskModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Task deleted successfully' };
  }
}
