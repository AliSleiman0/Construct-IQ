import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from './schemas/plan.schema';
import { CreatePlanDto } from './dto/create-plan.dto';
import { PartialType } from '@nestjs/mapped-types';

class UpdatePlanDto extends PartialType(CreatePlanDto) {}

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
  ) {}

  async findAll(includeInactive = false): Promise<any[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return this.planModel.find(filter).sort({ pricePerMonth: 1 }).lean();
  }

  async create(dto: CreatePlanDto): Promise<any> {
    const existing = await this.planModel.findOne({ tier: dto.tier });
    if (existing) throw new ConflictException('A plan with this tier already exists');

    return this.planModel.create({
      name: dto.name,
      tier: dto.tier,
      pricePerMonth: dto.pricePerMonth,
      description: dto.description ?? null,
      maxUsers: dto.maxUsers,
      maxProjects: dto.maxProjects,
      features: dto.features ?? [],
      isPopular: dto.isPopular ?? false,
      isActive: true,
    });
  }

  async update(id: string, dto: UpdatePlanDto): Promise<any> {
    const plan = await this.planModel.findById(id);
    if (!plan) throw new NotFoundException('Plan not found');
    Object.assign(plan, dto);
    await plan.save();
    return plan.toObject();
  }

  async remove(id: string): Promise<any> {
    const plan = await this.planModel.findByIdAndDelete(id).lean();
    if (!plan) throw new NotFoundException('Plan not found');
    return { message: 'Plan deleted' };
  }
}
