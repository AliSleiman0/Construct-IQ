import apiClient from './client';
import type { Task, TaskStatus, TaskComment, CreateTaskPayload, UpdateTaskPayload } from '@/types/task.types';

type Raw = Record<string, any>;

function normaliseComment(c: Raw): TaskComment {
  const { _id, id, ...rest } = c;
  return { ...(rest as TaskComment), id: (id ?? _id) as string };
}

function normalise(t: Raw): Task {
  const { _id, id, comments, ...rest } = t;
  return {
    ...(rest as Task),
    id: (id ?? _id) as string,
    comments: Array.isArray(comments) ? comments.map(normaliseComment) : undefined,
  };
}

export const tasksApi = {
  list: async (params?: { projectId?: string; assignedToId?: string; status?: string }): Promise<Task[]> => {
    const res = await apiClient.get<Raw[]>('/tasks', { params });
    return (res.data ?? []).map(normalise);
  },

  getById: async (id: string): Promise<Task> => {
    const res = await apiClient.get<Raw>(`/tasks/${id}`);
    return normalise(res.data);
  },

  create: async (payload: CreateTaskPayload): Promise<Task> => {
    const res = await apiClient.post<Raw>('/tasks', payload);
    return normalise(res.data);
  },

  update: async (id: string, payload: UpdateTaskPayload): Promise<Task> => {
    const res = await apiClient.patch<Raw>(`/tasks/${id}`, payload);
    return normalise(res.data);
  },

  assign: async (id: string, assignedToId: string): Promise<Task> => {
    const res = await apiClient.patch<Raw>(`/tasks/${id}/assign`, { assignedToId });
    return normalise(res.data);
  },

  addComment: async (id: string, body: string): Promise<TaskComment> => {
    const res = await apiClient.post<Raw>(`/tasks/${id}/comments`, { body });
    return normaliseComment(res.data);
  },

  // Persist a column's card order (top → bottom). Also commits a cross-column drop.
  reorder: async (payload: { status: TaskStatus; taskIds: string[] }): Promise<void> => {
    await apiClient.patch('/tasks/reorder', payload);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },
};
