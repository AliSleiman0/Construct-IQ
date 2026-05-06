import apiClient from './client';

export const valuationsApi = {
  list: async (params?: { projectId?: string }): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/valuations', { params });
    return res.data;
  },

  create: async (payload: {
    projectId: string;
    period: string;
    amountUsd: number;
    retentionUsd?: number;
  }): Promise<any> => {
    const res = await apiClient.post<any>('/valuations', payload);
    return res.data;
  },

  update: async (id: string, payload: { amountUsd?: number; retentionUsd?: number; status?: string }): Promise<any> => {
    const res = await apiClient.patch<any>(`/valuations/${id}`, payload);
    return res.data;
  },

  certify: async (id: string): Promise<any> => {
    const res = await apiClient.post<any>(`/valuations/${id}/certify`);
    return res.data;
  },
};
