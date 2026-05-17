import { Injectable, NotFoundException, ConflictException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feature, FeatureDocument } from './schemas/feature.schema';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { PartialType } from '@nestjs/mapped-types';
import { ALL_FEATURE_DEFINITIONS } from '../../common/constants/platform-features';

class UpdateFeatureDto extends PartialType(CreateFeatureDto) {}

@Injectable()
export class FeaturesService implements OnModuleInit {
  private readonly logger = new Logger(FeaturesService.name);

  constructor(
    @InjectModel(Feature.name) private featureModel: Model<FeatureDocument>,
  ) {}

  /**
   * On every server startup:
   *   1. Insert any feature definitions present in platform-features.ts but
   *      missing from the DB. Existing rows (including SA edits) are kept.
   *   2. Delete any catalog row whose key starts with `ai_` — AI features
   *      were moved to a separate product line (see ai-features.ts) and must
   *      not appear in the core catalog. Idempotent; no-op once clean.
   */
  async onModuleInit(): Promise<void> {
    // Step 1: insert missing core features
    const existingKeys = new Set(
      (await this.featureModel.find({}, { key: 1 }).lean()).map((f) => f.key),
    );

    const missing = ALL_FEATURE_DEFINITIONS.filter((d) => !existingKeys.has(d.key));

    if (missing.length > 0) {
      await this.featureModel.insertMany(
        missing.map((d) => ({ key: d.key, name: d.name, description: d.description, isActive: true })),
      );
      this.logger.log(`Seeded ${missing.length} new feature(s): ${missing.map((d) => d.key).join(', ')}`);
    } else {
      this.logger.log(`Feature catalog up to date (${existingKeys.size} features)`);
    }

    // Step 2: sweep stray AI keys out of the core catalog
    const aiDeleted = await this.featureModel.deleteMany({ key: { $regex: /^ai_/ } });
    if (aiDeleted.deletedCount && aiDeleted.deletedCount > 0) {
      this.logger.log(
        `Removed ${aiDeleted.deletedCount} ai_* key(s) from core feature catalog (moved to ai_features collection)`,
      );
    }
  }

  async findAll(includeInactive = false): Promise<any[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return this.featureModel.find(filter).sort({ name: 1 }).lean();
  }

  async findOne(id: string): Promise<any> {
    const feature = await this.featureModel.findById(id).lean();
    if (!feature) throw new NotFoundException('Feature not found');
    return feature;
  }

  /** Find features by their keys — used by plan-feature resolution. */
  async findByKeys(keys: string[]): Promise<any[]> {
    return this.featureModel.find({ key: { $in: keys } }).lean();
  }

  async create(dto: CreateFeatureDto): Promise<any> {
    const exists = await this.featureModel.findOne({ key: dto.key });
    if (exists) throw new ConflictException(`A feature with key "${dto.key}" already exists`);

    return this.featureModel.create({
      key: dto.key,
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    });
  }

  async update(id: string, dto: UpdateFeatureDto): Promise<any> {
    const feature = await this.featureModel.findById(id);
    if (!feature) throw new NotFoundException('Feature not found');

    if (dto.key && dto.key !== feature.key) {
      throw new ConflictException('The feature key cannot be changed after creation');
    }

    Object.assign(feature, dto);
    await feature.save();
    return feature.toObject();
  }

  async remove(id: string): Promise<any> {
    const feature = await this.featureModel.findByIdAndDelete(id).lean();
    if (!feature) throw new NotFoundException('Feature not found');
    return { message: 'Feature deleted' };
  }
}
