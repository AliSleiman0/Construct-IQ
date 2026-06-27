import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Phase, PhaseDocument } from './schemas/phase.schema';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';

@Injectable()
export class PhasesService {
  constructor(
    @InjectModel(Phase.name) private phaseModel: Model<PhaseDocument>,
  ) {}

  async findAll(projectId: string, organizationId: string, isSuperAdmin: boolean): Promise<any[]> {
    const filter: Record<string, unknown> = { projectId };
    if (!isSuperAdmin) filter.organizationId = organizationId;
    return this.phaseModel.find(filter).sort({ order: 1 }).lean();
  }

  async create(projectId: string, organizationId: string, dto: CreatePhaseDto): Promise<any> {
    return this.phaseModel.create({
      organizationId,
      projectId,
      name: dto.name,
      description: dto.description ?? null,
      order: dto.order ?? 0,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      status: dto.status,
      dependsOnPhaseIds: dto.dependsOnPhaseIds ?? [],
    });
  }

  async update(
    phaseId: string,
    projectId: string,
    organizationId: string,
    dto: UpdatePhaseDto,
    isSuperAdmin: boolean,
  ): Promise<any> {
    const filter: Record<string, unknown> = { _id: phaseId, projectId };
    if (!isSuperAdmin) filter.organizationId = organizationId;
    const phase = await this.phaseModel.findOne(filter);
    if (!phase) throw new NotFoundException('Phase not found');

    if (dto.name !== undefined) phase.name = dto.name;
    if (dto.description !== undefined) phase.description = dto.description ?? null;
    if (dto.order !== undefined) phase.order = dto.order;
    if (dto.startDate !== undefined)
      phase.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined)
      phase.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.status !== undefined) phase.status = dto.status;
    if (dto.dependsOnPhaseIds !== undefined) phase.dependsOnPhaseIds = dto.dependsOnPhaseIds;

    await phase.save();
    return phase.toObject();
  }

  async remove(phaseId: string, projectId: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter: Record<string, unknown> = { _id: phaseId, projectId };
    if (!isSuperAdmin) filter.organizationId = organizationId;
    const phase = await this.phaseModel.findOneAndDelete(filter);
    if (!phase) throw new NotFoundException('Phase not found');
    // Referential integrity: drop this phase from sibling dependency lists.
    await this.phaseModel.updateMany(
      { dependsOnPhaseIds: phaseId },
      { $pull: { dependsOnPhaseIds: phaseId } },
    );
    return { message: 'Phase deleted successfully' };
  }
}
