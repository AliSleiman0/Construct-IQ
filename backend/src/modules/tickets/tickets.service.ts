import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ticket, TicketDocument } from './schemas/ticket.schema';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AddTicketCommentDto } from './dto/add-ticket-comment.dto';
import { TicketStatus, TicketPriority } from '../../common/enums';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
  ) {}

  async findAll(
    organizationId: string,
    isSuperAdmin: boolean,
    status?: TicketStatus,
    priority?: TicketPriority,
    reporterId?: string,
    assigneeId?: string,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (reporterId) filter.reporterId = reporterId;
    if (assigneeId) filter.assigneeId = assigneeId;
    return this.ticketModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async findById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const ticket = await this.ticketModel.findOne(filter).lean();
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async create(organizationId: string, reporterId: string, dto: CreateTicketDto): Promise<any> {
    return this.ticketModel.create({
      organizationId,
      reporterId,
      title: dto.title,
      body: dto.body,
      status: TicketStatus.OPEN,
      priority: dto.priority ?? TicketPriority.MEDIUM,
      assigneeId: null,
      comments: [],
    });
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateTicketDto,
    userId: string,
    isSuperAdmin: boolean,
  ): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const ticket = await this.ticketModel.findOne(filter);
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (dto.title !== undefined) ticket.title = dto.title;
    if (dto.body !== undefined) ticket.body = dto.body;
    if (dto.status !== undefined) {
      ticket.status = dto.status;
      if (dto.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
      }
    }
    if (dto.priority !== undefined) ticket.priority = dto.priority;

    await ticket.save();
    return ticket.toObject();
  }

  async assign(id: string, organizationId: string, assigneeId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const ticket = await this.ticketModel.findOne(filter);
    if (!ticket) throw new NotFoundException('Ticket not found');
    ticket.assigneeId = assigneeId;
    await ticket.save();
    return ticket.toObject();
  }

  async addComment(
    id: string,
    organizationId: string,
    authorId: string,
    dto: AddTicketCommentDto,
    isSuperAdmin: boolean,
  ): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const ticket = await this.ticketModel.findOne(filter);
    if (!ticket) throw new NotFoundException('Ticket not found');
    ticket.comments.push({ authorId, kind: dto.kind ?? 'reply', body: dto.body } as any);
    await ticket.save();
    return ticket.comments[ticket.comments.length - 1];
  }

  async softDelete(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const ticket = await this.ticketModel.findOne(filter);
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.ticketModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Ticket deleted successfully' };
  }
}
