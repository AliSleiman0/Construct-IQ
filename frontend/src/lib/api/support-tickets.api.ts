import apiClient from './client';
import type {
  SupportTicket,
  CreateTicketPayload,
  UpdateTicketPayload,
  CreateCommentPayload,
  TicketComment,
} from '@/types/ticket.types';

export const supportTicketsApi = {
  list: async (): Promise<SupportTicket[]> => {
    const res = await apiClient.get<SupportTicket[]>('/support-tickets');
    return res.data;
  },

  getById: async (id: string): Promise<SupportTicket> => {
    const res = await apiClient.get<SupportTicket>(`/support-tickets/${id}`);
    return res.data;
  },

  create: async (payload: CreateTicketPayload): Promise<SupportTicket> => {
    const res = await apiClient.post<SupportTicket>('/support-tickets', payload);
    return res.data;
  },

  update: async (id: string, payload: UpdateTicketPayload): Promise<SupportTicket> => {
    const res = await apiClient.patch<SupportTicket>(`/support-tickets/${id}`, payload);
    return res.data;
  },

  addComment: async (ticketId: string, payload: CreateCommentPayload): Promise<TicketComment> => {
    const res = await apiClient.post<TicketComment>(`/support-tickets/${ticketId}/comments`, payload);
    return res.data;
  },
};
