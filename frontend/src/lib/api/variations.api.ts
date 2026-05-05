import apiClient from './client';

export const variationsApi = {
  list: async (params?: { projectId?: string }): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/variations', { params });
    return res.data;
  },

  create: async (payload: {
    projectId: string;
    title: string;
    impactAmount: number;
    description?: string;
    currency?: string;
  }): Promise<any> => {
    const res = await apiClient.post<any>('/variations', payload);
    return res.data;
  },

  update: async (id: string, payload: { title?: string; description?: string; impactAmount?: number; status?: string }): Promise<any> => {
    const res = await apiClient.patch<any>(`/variations/${id}`, payload);
    return res.data;
  },

  approve: async (id: string): Promise<any> => {
    const res = await apiClient.post<any>(`/variations/${id}/approve`);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/variations/${id}`);
  },
};
