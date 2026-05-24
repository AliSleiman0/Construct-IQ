import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { useAuthStore } from '@/store/auth.store';

export function useOrgDashboard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['dashboard', 'org'],
    queryFn: dashboardApi.getOrgDashboard,
    enabled: isAuthenticated,
  });
}

export function usePmDashboard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['dashboard', 'pm'],
    queryFn: dashboardApi.getPmDashboard,
    enabled: isAuthenticated,
  });
}

export function useSiteEngDashboard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['dashboard', 'site-eng'],
    queryFn: dashboardApi.getSiteEngDashboard,
    enabled: isAuthenticated,
  });
}
