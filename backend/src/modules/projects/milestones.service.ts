import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Milestone, MilestoneDocument } from './schemas/milestone.schema';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { PartialType } from '@nestjs/mapped-types';

class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {}

@Injectable()
export class MilestonesService {
  constructor(
    @InjectModel(Milestone.name) private milestoneModel: Model<MilestoneDocument>,
  ) {}

  async findAll(projectId: string, organizationId: string, isSuperAdmin: boolean): Promise<any[]> {
    const filter: Record<string, unknown> = { projectId };
    if (!isSuperAdmin) filter.organizationId = organizationId;
    return this.milestoneModel.find(filter).sort({ targetDate: 1 }).lean();
  }

  async create(projectId: string, organizationId: string, dto: CreateMilestoneDto): Promise<any> {
    return this.milestoneModel.create({
      organizationId,
      projectId,
      phaseId: dto.phaseId ?? null,
      name: dto.name,
      description: dto.description ?? null,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      status: dto.status,
      percentComplete: dto.percentComplete ?? 0,
    });
  }

  async update(
    milestoneId: string,
    projectId: string,
    organizationId: string,
    dto: UpdateMilestoneDto,
    isSuperAdmin: boolean,
  ): Promise<any> {
    const filter: Record<string, unknown> = { _id: milestoneId, projectId };
    if (!isSuperAdmin) filter.organizationId = organizationId;
    const milestone = await this.milestoneModel.findOne(filter);
    if (!milestone) throw new NotFoundException('Milestone not found');

    if (dto.name !== undefined) milestone.name = dto.name;
    if (dto.description !== undefined) milestone.description = dto.description ?? null;
    if (dto.phaseId !== undefined) milestone.phaseId = dto.phaseId ?? null;
    if (dto.targetDate !== undefined)
      milestone.targetDate = dto.targetDate ? new Date(dto.targetDate) : null;
    if (dto.status !== undefined) milestone.status = dto.status;
    if (dto.percentComplete !== undefined) milestone.percentComplete = dto.percentComplete;

    if (dto.status === 'COMPLETED' && !milestone.completedDate) {
      milestone.completedDate = new Date();
    }

    await milestone.save();
    return milestone.toObject();
  }

  async remove(milestoneId: string, projectId: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter: Record<string, unknown> = { _id: milestoneId, projectId };
    if (!isSuperAdmin) filter.organizationId = organizationId;
    const milestone = await this.milestoneModel.findOneAndDelete(filter);
    if (!milestone) throw new NotFoundException('Milestone not found');
    return { message: 'Milestone deleted successfully' };
  }
}
