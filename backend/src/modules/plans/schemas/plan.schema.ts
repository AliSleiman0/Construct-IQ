import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { PlanTier } from '../../../common/enums';

export type PlanDocument = CuidHydratedDocument<Plan>;

@Schema({ collection: 'plans', timestamps: true })
export class Plan {
  _id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({
    type: String,
    enum: Object.values(PlanTier),
    required: true,
    unique: true,
  })
  tier: PlanTier;

  @Prop({ type: Number, required: true, min: 0 })
  pricePerMonth: number;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: Number, required: true, min: 1 })
  maxUsers: number;

  @Prop({ type: Number, required: true, min: 1 })
  maxProjects: number;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ type: Boolean, default: false })
  isPopular: boolean;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
