import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';

export type SupplierDocument = CuidHydratedDocument<Supplier>;

@Schema({ collection: 'suppliers', timestamps: true })
export class Supplier {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  contactName: string | null;

  @Prop({ type: String, default: null, lowercase: true, trim: true })
  email: string | null;

  @Prop({ type: String, default: null })
  phone: string | null;

  @Prop({ type: String, default: null })
  address: string | null;

  @Prop({ type: String, default: null })
  taxId: string | null;

  @Prop({ type: String, default: null })
  website: string | null;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String, default: null })
  notes: string | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);

SupplierSchema.plugin(softDeletePlugin);
