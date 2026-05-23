import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports.api';
import { useAuthStore } from '@/store/auth.store';

/** Reports for a single project (used by the project-detail Reports tab). */
export function useReports(projectId: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['reports', 'project', projectId],
    queryFn: () => reportsApi.list({ projectId: projectId! }),
    enabled: isAuthenticated && !!projectId,
  });
}

/** All org daily reports (used by the standalone /pm/reports list). */
export function useAllReports() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['reports', 'all'],
    queryFn: () => reportsApi.list(),
    enabled: isAuthenticated,
  });
}

/** A single daily report by id (used by the detail page). */
export function useReport(id: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['reports', 'detail', id],
    queryFn: () => reportsApi.getById(id!),
    enabled: isAuthenticated && !!id,
  });
}
