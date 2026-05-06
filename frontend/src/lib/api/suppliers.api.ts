import apiClient from './client';

export const suppliersApi = {
  list: async (): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/suppliers');
    return res.data;
  },

  getById: async (id: string): Promise<any> => {
    const res = await apiClient.get<any>(`/suppliers/${id}`);
    return res.data;
  },

  create: async (payload: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    website?: string;
    notes?: string;
  }): Promise<any> => {
    const res = await apiClient.post<any>('/suppliers', payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<any>): Promise<any> => {
    const res = await apiClient.patch<any>(`/suppliers/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },
};
