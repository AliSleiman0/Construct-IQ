import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supportTicketsApi } from '@/lib/api/support-tickets.api';
import type { CreateTicketPayload, UpdateTicketPayload, CreateCommentPayload } from '@/types/ticket.types';

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTicketPayload) => supportTicketsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support-tickets'] }),
  });
}

export function useUpdateTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTicketPayload) => supportTicketsApi.update(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets', ticketId] });
    },
  });
}

export function useAddComment(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCommentPayload) => supportTicketsApi.addComment(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets', ticketId] });
    },
  });
}
