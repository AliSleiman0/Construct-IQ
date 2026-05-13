import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChatSession,
  ChatSessionDocument,
} from '../schemas/chat-session.schema';
import {
  ChatMessage,
  ChatMessageDocument,
} from '../schemas/chat-message.schema';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class ChatSessionService {
  private readonly logger = new Logger(ChatSessionService.name);

  constructor(
    @InjectModel(ChatSession.name)
    private chatSessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessageDocument>,
  ) {}

  async getOrCreate(
    userId: string,
    organizationId: string,
    sessionId?: string,
  ): Promise<ChatSessionDocument> {
    if (sessionId) {
      const existing = await this.chatSessionModel.findOne({ _id: sessionId });
      if (
        existing &&
        existing.userId === userId &&
        existing.organizationId === organizationId
      ) {
        return existing;
      }
    }
    return this.chatSessionModel.create({ userId, organizationId });
  }

  async appendMessage(
    chatSessionId: string,
    role: 'user' | 'assistant',
    content: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.chatMessageModel.create({
      chatSessionId,
      role,
      content,
      userId: role === 'user' ? userId ?? null : null,
      metadata: metadata ?? null,
    });
  }

  async loadHistory(
    chatSessionId: string,
    limit = 10,
  ): Promise<ChatHistoryMessage[]> {
    const messages = await this.chatMessageModel
      .find({ chatSessionId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return messages
      .reverse()
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }
}
