import apiClient from './client';
import type { Task, CreateTaskPayload, UpdateTaskPayload } from '@/types/task.types';

export const tasksApi = {
  list: async (params?: { projectId?: string; assignedToId?: string; status?: string }): Promise<Task[]> => {
    const res = await apiClient.get<Task[]>('/tasks', { params });
    return res.data;
  },

  getById: async (id: string): Promise<Task> => {
    const res = await apiClient.get<Task>(`/tasks/${id}`);
    return res.data;
  },

  create: async (payload: CreateTaskPayload): Promise<Task> => {
    const res = await apiClient.post<Task>('/tasks', payload);
    return res.data;
  },

  update: async (id: string, payload: UpdateTaskPayload): Promise<Task> => {
    const res = await apiClient.patch<Task>(`/tasks/${id}`, payload);
    return res.data;
  },

  assign: async (id: string, assignedToId: string): Promise<Task> => {
    const res = await apiClient.patch<Task>(`/tasks/${id}/assign`, { assignedToId });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },
};
