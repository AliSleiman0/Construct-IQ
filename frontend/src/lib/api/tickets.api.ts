import apiClient from './client';

export const ticketsApi = {
  list: async (params?: {
    status?: string;
    priority?: string;
    reporterId?: string;
    assigneeId?: string;
  }): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/tickets', { params });
    return res.data;
  },

  getById: async (id: string): Promise<any> => {
    const res = await apiClient.get<any>(`/tickets/${id}`);
    return res.data;
  },

  create: async (payload: { title: string; body: string; priority?: string }): Promise<any> => {
    const res = await apiClient.post<any>('/tickets', payload);
    return res.data;
  },

  update: async (id: string, payload: { title?: string; body?: string; status?: string; priority?: string }): Promise<any> => {
    const res = await apiClient.patch<any>(`/tickets/${id}`, payload);
    return res.data;
  },

  assign: async (id: string, assigneeId: string): Promise<any> => {
    const res = await apiClient.patch<any>(`/tickets/${id}/assign`, { assigneeId });
    return res.data;
  },

  addComment: async (id: string, body: string, kind?: 'reply' | 'internal'): Promise<any> => {
    const res = await apiClient.post<any>(`/tickets/${id}/comments`, { body, kind });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tickets/${id}`);
  },
};
