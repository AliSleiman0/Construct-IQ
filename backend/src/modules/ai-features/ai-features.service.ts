import { Injectable, NotFoundException, ConflictException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiFeature, AiFeatureDocument } from './schemas/ai-feature.schema';
import { CreateAiFeatureDto } from './dto/create-ai-feature.dto';
import { PartialType } from '@nestjs/mapped-types';
import { ALL_AI_FEATURE_DEFINITIONS } from '../../common/constants/ai-features';

class UpdateAiFeatureDto extends PartialType(CreateAiFeatureDto) {}

@Injectable()
export class AiFeaturesService implements OnModuleInit {
  private readonly logger = new Logger(AiFeaturesService.name);

  constructor(
    @InjectModel(AiFeature.name) private aiFeatureModel: Model<AiFeatureDocument>,
  ) {}

  /**
   * On every server startup, insert any AI feature definitions that exist in
   * ai-features.ts but are not yet in the database. Existing DB records
   * (including super-admin edits) are left untouched.
   */
  async onModuleInit(): Promise<void> {
    const existingKeys = new Set(
      (await this.aiFeatureModel.find({}, { key: 1 }).lean()).map((f) => f.key),
    );

    const missing = ALL_AI_FEATURE_DEFINITIONS.filter((d) => !existingKeys.has(d.key));

    if (missing.length === 0) {
      this.logger.log(`AI feature catalog up to date (${existingKeys.size} features)`);
      return;
    }

    await this.aiFeatureModel.insertMany(
      missing.map((d) => ({
        key: d.key,
        name: d.name,
        description: d.description,
        isActive: d.isActive ?? true,
      })),
    );

    this.logger.log(`Seeded ${missing.length} new ai-feature(s): ${missing.map((d) => d.key).join(', ')}`);
  }

  async findAll(includeInactive = false): Promise<any[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return this.aiFeatureModel.find(filter).sort({ name: 1 }).lean();
  }

  async findOne(id: string): Promise<any> {
    const feature = await this.aiFeatureModel.findById(id).lean();
    if (!feature) throw new NotFoundException('AI feature not found');
    return feature;
  }

  /** Find AI features by their keys — used by AI plan-feature resolution. */
  async findByKeys(keys: string[]): Promise<any[]> {
    return this.aiFeatureModel.find({ key: { $in: keys } }).lean();
  }

  async create(dto: CreateAiFeatureDto): Promise<any> {
    const exists = await this.aiFeatureModel.findOne({ key: dto.key });
    if (exists) throw new ConflictException(`An AI feature with key "${dto.key}" already exists`);

    return this.aiFeatureModel.create({
      key: dto.key,
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    });
  }

  async update(id: string, dto: UpdateAiFeatureDto): Promise<any> {
    const feature = await this.aiFeatureModel.findById(id);
    if (!feature) throw new NotFoundException('AI feature not found');

    if (dto.key && dto.key !== feature.key) {
      throw new ConflictException('The AI feature key cannot be changed after creation');
    }

    Object.assign(feature, dto);
    await feature.save();
    return feature.toObject();
  }

  async remove(id: string): Promise<any> {
    const feature = await this.aiFeatureModel.findByIdAndDelete(id).lean();
    if (!feature) throw new NotFoundException('AI feature not found');
    return { message: 'AI feature deleted' };
  }
}
