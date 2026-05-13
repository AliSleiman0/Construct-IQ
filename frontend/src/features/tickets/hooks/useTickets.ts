import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '@/lib/api/tickets.api';
import { useSnackbar } from 'notistack';

export function useTickets(params?: { status?: string; priority?: string; reporterId?: string; assigneeId?: string }) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => ticketsApi.list(params),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getById(id),
    enabled: !!id,
  });
}

export function useUpdateTicket(id: string) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (payload: { status?: string; priority?: string; title?: string; body?: string }) =>
      ticketsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      enqueueSnackbar('Ticket updated.', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to update ticket.', { variant: 'error' }),
  });
}

export function useAssignTicket(id: string) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (assigneeId: string) => ticketsApi.assign(id, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      enqueueSnackbar('Ticket assigned.', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to assign ticket.', { variant: 'error' }),
  });
}

export function useAddTicketComment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, kind }: { body: string; kind?: 'reply' | 'internal' }) =>
      ticketsApi.addComment(id, body, kind),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (payload: { title: string; body: string; priority?: string }) =>
      ticketsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      enqueueSnackbar('Ticket created.', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to create ticket.', { variant: 'error' }),
  });
}
