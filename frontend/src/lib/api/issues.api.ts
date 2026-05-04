import apiClient from './client';
import type { Issue, CreateIssuePayload, UpdateIssuePayload } from '@/types/issue.types';

export const issuesApi = {
  listByProject: async (projectId: string): Promise<Issue[]> => {
    const res = await apiClient.get<Issue[]>(`/projects/${projectId}/issues`);
    return res.data;
  },

  create: async (projectId: string, payload: CreateIssuePayload): Promise<Issue> => {
    const res = await apiClient.post<Issue>(`/projects/${projectId}/issues`, payload);
    return res.data;
  },

  update: async (id: string, payload: UpdateIssuePayload): Promise<Issue> => {
    const res = await apiClient.patch<Issue>(`/issues/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/issues/${id}`);
  },
};
