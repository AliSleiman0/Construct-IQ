import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type NotificationDocument = CuidHydratedDocument<Notification>;

@Schema({
  collection: 'notifications',
  timestamps: { createdAt: true, updatedAt: false },
})
export class Notification {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'User', required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, default: null })
  entityType: string | null;

  @Prop({ type: String, default: null })
  entityId: string | null;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  metadata: Record<string, unknown> | null;

  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
