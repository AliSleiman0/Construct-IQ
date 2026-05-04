import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type AuditLogDocument = CuidHydratedDocument<AuditLog>;

@Schema({
  collection: 'audit_logs',
  timestamps: { createdAt: true, updatedAt: false },
})
export class AuditLog {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', default: null })
  projectId: string | null;

  @Prop({ type: String, ref: 'User', default: null, index: true })
  actorUserId: string | null;

  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: String, required: true, index: true })
  entityType: string;

  @Prop({ type: String, default: null, index: true })
  entityId: string | null;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  metadata: Record<string, unknown> | null;

  @Prop({ type: String, default: null })
  ipAddress: string | null;

  @Prop({ type: String, default: null })
  userAgent: string | null;

  createdAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ entityType: 1, entityId: 1 });
