import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api/payments.api';
import { useAuthStore } from '@/store/auth.store';

/**
 * Payment installments visible to the current user.
 *
 * Deliberately does not send a `buyerId`: the backend intersects that param
 * with the caller's own visibility, so sending one can only narrow the result.
 * A CLIENT gets their own schedule; staff get the project's.
 */
export function usePayments(params?: { unitId?: string; buyerId?: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['payments', params?.unitId ?? null, params?.buyerId ?? null],
    queryFn: () => paymentsApi.list(params),
    enabled: isAuthenticated,
  });
}
