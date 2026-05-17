import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type AiFeatureDocument = CuidHydratedDocument<AiFeature>;

@Schema({ collection: 'ai_features', timestamps: true })
export class AiFeature {
  _id: string;

  /** Stable snake_case identifier used in code AI feature-flag checks.
   *  e.g. 'ai_assistant', 'ai_takeoff'. Never changes after creation. */
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  key: string;

  /** Human-readable display name shown in the UI */
  @Prop({ type: String, required: true, trim: true })
  name: string;

  /** Short explanation of what the AI capability does */
  @Prop({ type: String, default: null })
  description: string | null;

  /** Super admin can deactivate an AI feature to hide it from AI plan pickers
   *  without deleting it. Roadmap items ship inactive. */
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const AiFeatureSchema = SchemaFactory.createForClass(AiFeature);
