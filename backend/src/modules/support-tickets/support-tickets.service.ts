import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

@Injectable()
export class SupportTicketsService {
  constructor(private prisma: PrismaService) {}

  private readonly TICKET_INCLUDE = {
    createdBy: {
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    },
    assignedTo: {
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    },
    _count: { select: { comments: true } },
  } as const;

  async findAll(organizationId: string) {
    return this.prisma.supportTicket.findMany({
      where: { organizationId },
      include: this.TICKET_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, organizationId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId },
      include: {
        ...this.TICKET_INCLUDE,
        comments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return ticket;
  }

  async create(dto: CreateTicketDto, organizationId: string, createdById: string) {
    return this.prisma.supportTicket.create({
      data: {
        organizationId,
        createdById,
        subject: dto.subject,
        description: dto.description,
        category: (dto.category as TicketCategory) ?? 'GENERAL',
        priority: (dto.priority as TicketPriority) ?? 'MEDIUM',
      },
      include: this.TICKET_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateTicketDto, organizationId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const data: Record<string, any> = {};
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category as TicketCategory;
    if (dto.priority !== undefined) data.priority = dto.priority as TicketPriority;
    if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;

    if (dto.status !== undefined) {
      data.status = dto.status as TicketStatus;
      if (dto.status === 'RESOLVED' && !ticket.resolvedAt) {
        data.resolvedAt = new Date();
      }
      if (dto.status === 'CLOSED' && !ticket.closedAt) {
        data.closedAt = new Date();
      }
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data,
      include: this.TICKET_INCLUDE,
    });
  }

  async addComment(
    ticketId: string,
    dto: CreateCommentDto,
    organizationId: string,
    userId: string,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, organizationId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return this.prisma.ticketComment.create({
      data: {
        ticketId,
        userId,
        content: dto.content,
        isInternal: dto.isInternal ?? false,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });
  }
}
