import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type OrgSettingsDocument = CuidHydratedDocument<OrgSettings>;

@Schema({ collection: 'org_settings', timestamps: true })
export class OrgSettings {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, unique: true, index: true })
  organizationId: string;

  @Prop({ type: String, default: '#1976d2' })
  brandColor: string;

  @Prop({ type: String, default: 'auto' })
  theme: string;

  @Prop({ type: String, default: 'America/Los_Angeles' })
  timezone: string;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: String, default: 'MMM D, YYYY' })
  dateFormat: string;

  @Prop({ type: String, default: 'monday' })
  weekStart: string;

  @Prop({ type: String, default: 'imperial' })
  measurement: string;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  notifications: Record<string, any>;

  @Prop({ type: Boolean, default: false })
  twoFactorRequired: boolean;

  @Prop({ type: String, default: 'standard' })
  passwordPolicy: string;

  @Prop({ type: Number, default: 120 })
  sessionTimeoutMin: number;

  @Prop({ type: Boolean, default: false })
  ssoEnabled: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const OrgSettingsSchema = SchemaFactory.createForClass(OrgSettings);
