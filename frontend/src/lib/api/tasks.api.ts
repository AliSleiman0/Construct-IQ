import apiClient from './client';
import type { Task, CreateTaskPayload, UpdateTaskPayload } from '@/types/task.types';

type RawTask = Omit<Task, 'id'> & { id?: string; _id?: string };

function normalise(t: RawTask): Task {
  const { _id, id, ...rest } = t;
  return { ...rest, id: (id ?? _id) as string };
}

export const tasksApi = {
  list: async (params?: { projectId?: string; assignedToId?: string; status?: string }): Promise<Task[]> => {
    const res = await apiClient.get<RawTask[]>('/tasks', { params });
    return (res.data ?? []).map(normalise);
  },

  getById: async (id: string): Promise<Task> => {
    const res = await apiClient.get<RawTask>(`/tasks/${id}`);
    return normalise(res.data);
  },

  create: async (payload: CreateTaskPayload): Promise<Task> => {
    const res = await apiClient.post<RawTask>('/tasks', payload);
    return normalise(res.data);
  },

  update: async (id: string, payload: UpdateTaskPayload): Promise<Task> => {
    const res = await apiClient.patch<RawTask>(`/tasks/${id}`, payload);
    return normalise(res.data);
  },

  assign: async (id: string, assignedToId: string): Promise<Task> => {
    const res = await apiClient.patch<RawTask>(`/tasks/${id}/assign`, { assignedToId });
    return normalise(res.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },
};
