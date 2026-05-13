import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type FeatureDocument = CuidHydratedDocument<Feature>;

@Schema({ collection: 'features', timestamps: true })
export class Feature {
  _id: string;

  /** Stable snake_case identifier used in code feature-flag checks.
   *  e.g. 'daily_reports', 'ai_supplier_search'. Never changes after creation. */
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  key: string;

  /** Human-readable display name shown in the UI */
  @Prop({ type: String, required: true, trim: true })
  name: string;

  /** Short explanation of what the feature does — shown on plan cards and the catalog */
  @Prop({ type: String, default: null })
  description: string | null;

  /** Super admin can deactivate a feature to hide it from plan picker without deleting */
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const FeatureSchema = SchemaFactory.createForClass(Feature);
// unique: true on the @Prop already creates the index — no duplicate needed
