import { useQuery } from '@tanstack/react-query';
import { supportTicketsApi } from '@/lib/api/support-tickets.api';

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['support-tickets', id],
    queryFn: () => supportTicketsApi.getById(id),
    enabled: !!id,
  });
}
