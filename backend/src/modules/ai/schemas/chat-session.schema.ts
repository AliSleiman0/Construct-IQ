import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type ChatSessionDocument = CuidHydratedDocument<ChatSession>;

@Schema({ collection: 'chat_sessions', timestamps: true })
export class ChatSession {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, ref: 'Project', default: null, index: true })
  projectId: string | null;

  @Prop({ type: String, ref: 'User', required: true, index: true })
  userId: string;

  @Prop({ type: String, default: null })
  title: string | null;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  metadata: Record<string, unknown> | null;

  createdAt: Date;
  updatedAt: Date;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
