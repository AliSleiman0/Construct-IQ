import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard.api';

export function useOrgDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'org'],
    queryFn: dashboardApi.getOrgDashboard,
  });
}
