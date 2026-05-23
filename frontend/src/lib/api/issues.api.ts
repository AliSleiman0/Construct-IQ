import apiClient from './client';
import type { Issue, IssueComment, CreateIssuePayload, UpdateIssuePayload } from '@/types/issue.types';

type Raw = Record<string, any>;

function normaliseComment(c: Raw): IssueComment {
  const { _id, id, ...rest } = c;
  return { ...(rest as IssueComment), id: (id ?? _id) as string };
}

// Mirrors tasks.api.ts `normalise`: the backend serialises Mongoose docs with
// `_id`, so map it to `id` (the shape the frontend `Issue` type expects).
function normalise(t: Raw): Issue {
  const { _id, id, comments, ...rest } = t;
  return {
    ...(rest as Issue),
    id: (id ?? _id) as string,
    comments: Array.isArray(comments) ? comments.map(normaliseComment) : undefined,
  };
}

export const issuesApi = {
  list: async (params?: { projectId?: string; status?: string; severity?: string }): Promise<Issue[]> => {
    const res = await apiClient.get<Raw[]>('/issues', { params });
    return (res.data ?? []).map(normalise);
  },

  getById: async (id: string): Promise<Issue> => {
    const res = await apiClient.get<Raw>(`/issues/${id}`);
    return normalise(res.data);
  },

  create: async (payload: CreateIssuePayload): Promise<Issue> => {
    const res = await apiClient.post<Raw>('/issues', payload);
    return normalise(res.data);
  },

  update: async (id: string, payload: UpdateIssuePayload): Promise<Issue> => {
    const res = await apiClient.patch<Raw>(`/issues/${id}`, payload);
    return normalise(res.data);
  },

  assign: async (id: string, assignedToId: string): Promise<Issue> => {
    const res = await apiClient.patch<Raw>(`/issues/${id}/assign`, { assignedToId });
    return normalise(res.data);
  },

  addComment: async (id: string, body: string): Promise<IssueComment> => {
    const res = await apiClient.post<Raw>(`/issues/${id}/comments`, { body });
    return normaliseComment(res.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/issues/${id}`);
  },
};
