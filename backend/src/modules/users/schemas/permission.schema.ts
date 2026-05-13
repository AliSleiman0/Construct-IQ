import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type PermissionDocument = CuidHydratedDocument<Permission>;

@Schema({ collection: 'permissions', timestamps: { createdAt: true, updatedAt: false } })
export class Permission {
  _id: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, required: true })
  resource: string;

  @Prop({ type: String, required: true })
  action: string;

  createdAt: Date;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
