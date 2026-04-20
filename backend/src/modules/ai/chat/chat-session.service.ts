import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class ChatSessionService {
  private readonly logger = new Logger(ChatSessionService.name);

  constructor(private prisma: PrismaService) {}

  async getOrCreate(
    userId: string,
    organizationId: string,
    sessionId?: string,
  ) {
    if (sessionId) {
      const existing = await this.prisma.chatSession.findUnique({
        where: { id: sessionId },
      });
      if (existing && existing.userId === userId && existing.organizationId === organizationId) {
        return existing;
      }
    }

    return this.prisma.chatSession.create({
      data: { userId, organizationId },
    });
  }

  async appendMessage(
    chatSessionId: string,
    role: 'user' | 'assistant',
    content: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.chatMessage.create({
      data: {
        chatSessionId,
        role,
        content,
        userId: role === 'user' ? userId : null,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });
  }

  async loadHistory(chatSessionId: string, limit = 10): Promise<ChatHistoryMessage[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { chatSessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages
      .reverse()
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }
}
