import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard.api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
  });
}

export function useDashboardRecentProjects() {
  return useQuery({
    queryKey: ['dashboard', 'recent-projects'],
    queryFn: dashboardApi.getRecentProjects,
  });
}
