import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api/tasks.api';
import type { CreateTaskPayload, UpdateTaskPayload } from '@/types/task.types';

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksApi.create(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskPayload }) =>
      tasksApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
}
