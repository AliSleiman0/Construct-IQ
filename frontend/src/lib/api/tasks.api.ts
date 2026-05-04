import apiClient from './client';
import type { Task, CreateTaskPayload, UpdateTaskPayload } from '@/types/task.types';

export const tasksApi = {
  listByProject: async (projectId: string): Promise<Task[]> => {
    const res = await apiClient.get<Task[]>(`/projects/${projectId}/tasks`);
    return res.data;
  },

  getById: async (id: string): Promise<Task> => {
    const res = await apiClient.get<Task>(`/tasks/${id}`);
    return res.data;
  },

  create: async (projectId: string, payload: CreateTaskPayload): Promise<Task> => {
    const res = await apiClient.post<Task>(`/projects/${projectId}/tasks`, payload);
    return res.data;
  },

  update: async (id: string, payload: UpdateTaskPayload): Promise<Task> => {
    const res = await apiClient.patch<Task>(`/tasks/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },
};
