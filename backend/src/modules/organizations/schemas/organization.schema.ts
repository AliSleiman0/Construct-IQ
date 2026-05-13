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
  logoUrl: string | null;

  @Prop({ type: String, default: null })
  address: string | null;

  @Prop({ type: String, default: null })
  phone: string | null;

  @Prop({ type: String, default: null, lowercase: true, trim: true })
  email: string | null;

  @Prop({ type: String, default: null })
  website: string | null;

  // Null = unlimited.
  @Prop({ type: Number, default: null, min: 1 })
  maxUsers: number | null;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
