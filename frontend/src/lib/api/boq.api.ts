import apiClient from './client';

export const boqApi = {
  list: async (params?: { projectId?: string }): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/boq', { params });
    return res.data;
  },

  create: async (payload: {
    projectId: string;
    code: string;
    description: string;
    unit: string;
    quantity: number;
    unitRate: number;
    isLocked?: boolean;
  }): Promise<any> => {
    const res = await apiClient.post<any>('/boq', payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<{
    description: string;
    unit: string;
    quantity: number;
    unitRate: number;
    isLocked: boolean;
  }>): Promise<any> => {
    const res = await apiClient.patch<any>(`/boq/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/boq/${id}`);
  },
};
