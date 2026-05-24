import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api/tasks.api';
import { useAuthStore } from '@/store/auth.store';

interface UseTasksOptions {
  projectId?: string;
  assignedToId?: string;
  status?: string;
}

export function useTasks(options: UseTasksOptions = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { projectId, assignedToId, status } = options;
  return useQuery({
    queryKey: ['tasks', { projectId, assignedToId, status }],
    queryFn: () => tasksApi.list({ projectId, assignedToId, status }),
    enabled: isAuthenticated,
  });
}

export function useTask(id: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['tasks', 'detail', id],
    queryFn: () => tasksApi.getById(id!),
    enabled: isAuthenticated && !!id,
  });
}
