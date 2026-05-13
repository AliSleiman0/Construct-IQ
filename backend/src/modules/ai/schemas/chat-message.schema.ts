import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';

export type ChatMessageDocument = CuidHydratedDocument<ChatMessage>;

@Schema({
  collection: 'chat_messages',
  timestamps: { createdAt: true, updatedAt: false },
})
export class ChatMessage {
  _id: string;

  @Prop({ type: String, ref: 'ChatSession', required: true, index: true })
  chatSessionId: string;

  // Null for assistant/system messages.
  @Prop({ type: String, ref: 'User', default: null })
  userId: string | null;

  @Prop({ type: String, required: true, enum: ['user', 'assistant', 'system'] })
  role: 'user' | 'assistant' | 'system';

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  metadata: Record<string, unknown> | null;

  createdAt: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
