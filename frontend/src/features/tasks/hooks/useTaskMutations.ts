import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api/tasks.api';
import type { CreateTaskPayload, UpdateTaskPayload, TaskStatus } from '@/types/task.types';

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false });
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksApi.create(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskPayload }) =>
      tasksApi.update(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useReorderTasks() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (payload: { status: TaskStatus; taskIds: string[] }) =>
      tasksApi.reorder(payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => invalidate(),
  });
}

export function useAddTaskComment() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => tasksApi.addComment(id, body),
    onSuccess: () => invalidate(),
  });
}
