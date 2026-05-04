import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports.api';

export function useReports(projectId: string | null) {
  return useQuery({
    queryKey: ['reports', projectId],
    queryFn: () => reportsApi.listByProject(projectId!),
    enabled: !!projectId,
  });
}
