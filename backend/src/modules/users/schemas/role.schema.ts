import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type RoleDocument = CuidHydratedDocument<Role>;

@Schema({ collection: 'roles', timestamps: true })
export class Role {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: Boolean, default: false })
  isSystem: boolean;

  // Embeds the permission keys directly. Replaces the RolePermission join
  // table — permissions are a global, stable lookup table referenced by
  // their `name`. A role's effective permissions = these keys (validated
  // against Permission.name at write time by the service layer).
  @Prop({ type: [String], default: [] })
  permissionKeys: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

RoleSchema.index({ organizationId: 1, name: 1 }, { unique: true });
