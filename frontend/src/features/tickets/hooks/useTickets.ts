import { useQuery } from '@tanstack/react-query';
import { supportTicketsApi } from '@/lib/api/support-tickets.api';

export function useTickets() {
  return useQuery({
    queryKey: ['support-tickets'],
    queryFn: supportTicketsApi.list,
  });
}
