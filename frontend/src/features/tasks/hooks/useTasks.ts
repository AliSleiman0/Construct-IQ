import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api/tasks.api';

export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.listByProject(projectId!),
    enabled: !!projectId,
  });
}
