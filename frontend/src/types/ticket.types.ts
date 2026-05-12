export type TicketCategory = 'GENERAL' | 'BILLING' | 'TECHNICAL' | 'FEATURE_REQUEST';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';

export interface TicketUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user: TicketUser;
}

export interface SupportTicket {
  id: string;
  organizationId: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdById: string;
  assignedToId: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: TicketUser;
  assignedTo: TicketUser | null;
  _count: { comments: number };
  comments?: TicketComment[];
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  category?: TicketCategory;
  priority?: TicketPriority;
}

export interface UpdateTicketPayload {
  subject?: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  assignedToId?: string;
}

export interface CreateCommentPayload {
  content: string;
  isInternal?: boolean;
}
