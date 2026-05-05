import apiClient from './client';
import type { Issue, CreateIssuePayload, UpdateIssuePayload } from '@/types/issue.types';

export const issuesApi = {
  list: async (params?: { projectId?: string; status?: string; severity?: string }): Promise<Issue[]> => {
    const res = await apiClient.get<Issue[]>('/issues', { params });
    return res.data;
  },

  getById: async (id: string): Promise<Issue> => {
    const res = await apiClient.get<Issue>(`/issues/${id}`);
    return res.data;
  },

  create: async (payload: CreateIssuePayload): Promise<Issue> => {
    const res = await apiClient.post<Issue>('/issues', payload);
    return res.data;
  },

  update: async (id: string, payload: UpdateIssuePayload): Promise<Issue> => {
    const res = await apiClient.patch<Issue>(`/issues/${id}`, payload);
    return res.data;
  },

  assign: async (id: string, assignedToId: string): Promise<Issue> => {
    const res = await apiClient.patch<Issue>(`/issues/${id}/assign`, { assignedToId });
    return res.data;
  },

  addComment: async (id: string, body: string): Promise<any> => {
    const res = await apiClient.post<any>(`/issues/${id}/comments`, { body });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/issues/${id}`);
  },
};
