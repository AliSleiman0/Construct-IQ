import apiClient from './client';

export const unitsApi = {
  list: async (params?: { projectId?: string; status?: string }): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/units', { params });
    return res.data;
  },

  getById: async (id: string): Promise<any> => {
    const res = await apiClient.get<any>(`/units/${id}`);
    return res.data;
  },

  create: async (payload: {
    projectId: string;
    label: string;
    floor: number;
    sqft: number;
    priceUsd: number;
    type?: string;
    bedrooms?: number;
    bathrooms?: number;
    position?: string;
    status?: string;
    buyerId?: string;
    imageUrl?: string;
    description?: string;
  }): Promise<any> => {
    const res = await apiClient.post<any>('/units', payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<any>): Promise<any> => {
    const res = await apiClient.patch<any>(`/units/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/units/${id}`);
  },
};
