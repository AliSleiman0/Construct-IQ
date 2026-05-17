import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type OrganizationDocument = CuidHydratedDocument<Organization>;

@Schema({ collection: 'organizations', timestamps: true })
export class Organization {
  _id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ type: String, default: null })
  shortName: string | null;

  @Prop({ type: String, default: null })
  industry: string | null;

  @Prop({ type: String, default: null })
  size: string | null;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, default: null })
  logoUrl: string | null;

  @Prop({ type: String, default: null })
  street: string | null;

  @Prop({ type: String, default: null })
  city: string | null;

  @Prop({ type: String, default: null })
  state: string | null;

  @Prop({ type: String, default: null })
  zip: string | null;

  @Prop({ type: String, default: null })
  country: string | null;

  @Prop({ type: String, default: null })
  phone: string | null;

  @Prop({ type: String, default: null, lowercase: true, trim: true })
  email: string | null;

  @Prop({ type: String, default: null })
  website: string | null;

  // Null = unlimited.
  @Prop({ type: Number, default: null, min: 1 })
  maxUsers: number | null;

  /** The subscription plan this org is currently on. Null = no plan / free. */
  @Prop({ type: String, ref: 'Plan', default: null, index: true })
  planId: string | null;

  /** Optional AI subscription, sold independently of the core plan.
   *  Null = no AI. Requires a non-null planId to be set (enforced in service). */
  @Prop({ type: String, ref: 'AiPlan', default: null, index: true })
  aiPlanId: string | null;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
