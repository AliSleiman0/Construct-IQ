import { useQuery } from '@tanstack/react-query';
import { procurementApi } from '@/lib/api/procurement.api';
import { useAuthStore } from '@/store/auth.store';

export function useProcurementDashboard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['procurement-dashboard'],
    queryFn: () => procurementApi.getDashboard(),
    enabled: isAuthenticated,
  });
}
