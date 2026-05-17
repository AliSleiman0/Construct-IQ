import { Injectable, NotFoundException, ConflictException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiPlan, AiPlanDocument } from './schemas/ai-plan.schema';
import { CreateAiPlanDto } from './dto/create-ai-plan.dto';
import { PartialType } from '@nestjs/mapped-types';
import { AiPlanTier } from '../../common/enums';
import { AI_FEATURES } from '../../common/constants/ai-features';

class UpdateAiPlanDto extends PartialType(CreateAiPlanDto) {}

interface AiPlanSeed {
  tier: AiPlanTier;
  name: string;
  description: string;
  pricePerMonth: number;
  features: string[];
  isPopular?: boolean;
}

/**
 * Placeholder pricing. Super Admin overrides via /super-admin/ai-plans.
 * Marked with $0 so the UI surfaces an obvious "needs configuring" signal.
 */
const SEED_TIERS: AiPlanSeed[] = [
  {
    tier: AiPlanTier.ESSENTIALS,
    name: 'AI Essentials',
    description: 'Get started with AI: chat assistant and report summaries.',
    pricePerMonth: 0,
    features: [AI_FEATURES.AI_ASSISTANT.key, AI_FEATURES.AI_REPORT_SUMMARY.key],
  },
  {
    tier: AiPlanTier.ADVANCED,
    name: 'AI Advanced',
    description: 'Daily-use AI across procurement and reporting.',
    pricePerMonth: 0,
    features: [
      AI_FEATURES.AI_ASSISTANT.key,
      AI_FEATURES.AI_REPORT_SUMMARY.key,
      AI_FEATURES.AI_SUPPLIER_SEARCH.key,
    ],
    isPopular: true,
  },
  {
    tier: AiPlanTier.PRO,
    name: 'AI Pro',
    description: 'The full AI suite, including document search, risk detection, and takeoff.',
    pricePerMonth: 0,
    features: [
      AI_FEATURES.AI_ASSISTANT.key,
      AI_FEATURES.AI_REPORT_SUMMARY.key,
      AI_FEATURES.AI_SUPPLIER_SEARCH.key,
      AI_FEATURES.AI_DOC_SEARCH.key,
      AI_FEATURES.AI_RISK_DETECTION.key,
      AI_FEATURES.AI_TAKEOFF.key,
    ],
  },
];

@Injectable()
export class AiPlansService implements OnModuleInit {
  private readonly logger = new Logger(AiPlansService.name);

  constructor(
    @InjectModel(AiPlan.name) private aiPlanModel: Model<AiPlanDocument>,
  ) {}

  /**
   * On startup, seed any missing tiers. Existing tiers (including SA edits to
   * price/features) are left untouched. If SA deletes a tier doc, the seeder
   * will recreate it on next boot — treat that as recovery behavior, not a
   * bug. To "permanently" hide a tier, set isActive: false instead.
   */
  async onModuleInit(): Promise<void> {
    const existing = await this.aiPlanModel.find({}, { tier: 1 }).lean();
    const existingTiers = new Set(existing.map((p) => p.tier as AiPlanTier));

    const missing = SEED_TIERS.filter((t) => !existingTiers.has(t.tier));

    if (missing.length === 0) {
      this.logger.log(`AI plan catalog up to date (${existing.length} tiers)`);
      return;
    }

    await this.aiPlanModel.insertMany(
      missing.map((m) => ({
        name: m.name,
        tier: m.tier,
        pricePerMonth: m.pricePerMonth,
        description: m.description,
        features: m.features,
        isPopular: m.isPopular ?? false,
        isActive: true,
      })),
    );

    this.logger.log(`Seeded ${missing.length} AI plan tier(s): ${missing.map((m) => m.tier).join(', ')}`);
    this.logger.warn(
      'AI plans seeded with $0 placeholder pricing — update real prices via /super-admin/ai-plans',
    );
  }

  async findAll(includeInactive = false): Promise<any[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return this.aiPlanModel.find(filter).sort({ pricePerMonth: 1 }).lean();
  }

  async findOne(id: string): Promise<any> {
    const plan = await this.aiPlanModel.findById(id).lean();
    if (!plan) throw new NotFoundException('AI plan not found');
    return plan;
  }

  async create(dto: CreateAiPlanDto): Promise<any> {
    const existing = await this.aiPlanModel.findOne({ tier: dto.tier });
    if (existing) throw new ConflictException('An AI plan with this tier already exists');

    return this.aiPlanModel.create({
      name: dto.name,
      tier: dto.tier,
      pricePerMonth: dto.pricePerMonth,
      description: dto.description ?? null,
      features: dto.features ?? [],
      isPopular: dto.isPopular ?? false,
      isActive: true,
    });
  }

  async update(id: string, dto: UpdateAiPlanDto): Promise<any> {
    const plan = await this.aiPlanModel.findById(id);
    if (!plan) throw new NotFoundException('AI plan not found');
    Object.assign(plan, dto);
    await plan.save();
    return plan.toObject();
  }

  async remove(id: string): Promise<any> {
    const plan = await this.aiPlanModel.findByIdAndDelete(id).lean();
    if (!plan) throw new NotFoundException('AI plan not found');
    return { message: 'AI plan deleted' };
  }
}
