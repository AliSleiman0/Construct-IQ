import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';
import { TicketStatus, TicketPriority } from '../../../common/enums';

export type TicketDocument = CuidHydratedDocument<Ticket>;

// Embedded comment — owns its own _id so the frontend can reference it by ID.
// kind: 'reply' = visible to reporter; 'internal' = staff-only note.
@Schema({ _id: true, timestamps: true })
export class TicketComment {
  _id: string;

  @Prop({ type: String, ref: 'User', required: true })
  authorId: string;

  @Prop({ type: String, enum: ['reply', 'internal'], default: 'reply' })
  kind: string;

  @Prop({ type: String, required: true })
  body: string;

  createdAt: Date;
  updatedAt: Date;
}

export const TicketCommentSchema = SchemaFactory.createForClass(TicketComment);

@Schema({ collection: 'tickets', timestamps: true })
export class Ticket {
  _id: string;

  @Prop({ type: String, ref: 'Organization', required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  body: string;

  @Prop({
    type: String,
    enum: Object.values(TicketStatus),
    default: TicketStatus.OPEN,
    index: true,
  })
  status: TicketStatus;

  @Prop({
    type: String,
    enum: Object.values(TicketPriority),
    default: TicketPriority.MEDIUM,
    index: true,
  })
  priority: TicketPriority;

  @Prop({ type: String, ref: 'User', required: true, index: true })
  reporterId: string;

  @Prop({ type: String, ref: 'User', default: null, index: true })
  assigneeId: string | null;

  @Prop({ type: Date, default: null })
  resolvedAt: Date | null;

  @Prop({ type: [TicketCommentSchema], default: [] })
  comments: TicketComment[];

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

TicketSchema.plugin(softDeletePlugin);
TicketSchema.index({ organizationId: 1, status: 1 });
TicketSchema.index({ organizationId: 1, reporterId: 1 });
