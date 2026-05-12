import { useQuery } from '@tanstack/react-query';
import { plansApi } from '@/lib/api/plans.api';

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: () => plansApi.list(),
  });
}
