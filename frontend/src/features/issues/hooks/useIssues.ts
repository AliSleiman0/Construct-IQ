import { useQuery } from '@tanstack/react-query';
import { issuesApi } from '@/lib/api/issues.api';

export function useIssues(projectId: string | null) {
  return useQuery({
    queryKey: ['issues', projectId],
    queryFn: () => issuesApi.listByProject(projectId!),
    enabled: !!projectId,
  });
}
