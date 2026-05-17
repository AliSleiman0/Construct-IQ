import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { AiPlanTier } from '../../../common/enums';

export type AiPlanDocument = CuidHydratedDocument<AiPlan>;

@Schema({ collection: 'ai_plans', timestamps: true })
export class AiPlan {
  _id: string;

  @Prop({ type: String, required: true })
  name: string;

  /** ESSENTIALS / ADVANCED / PRO. Unique — at most one plan per tier. */
  @Prop({
    type: String,
    enum: Object.values(AiPlanTier),
    required: true,
    unique: true,
  })
  tier: AiPlanTier;

  @Prop({ type: Number, required: true, min: 0 })
  pricePerMonth: number;

  @Prop({ type: String, default: null })
  description: string | null;

  /** AI feature keys included in this tier (e.g. 'ai_assistant'). */
  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ type: Boolean, default: false })
  isPopular: boolean;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const AiPlanSchema = SchemaFactory.createForClass(AiPlan);
