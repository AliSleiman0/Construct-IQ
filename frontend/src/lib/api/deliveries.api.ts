import apiClient from './client';

export const deliveriesApi = {
  list: async (): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/deliveries');
    return res.data;
  },

  getById: async (id: string): Promise<any> => {
    const res = await apiClient.get<any>(`/deliveries/${id}`);
    return res.data;
  },

  create: async (payload: {
    purchaseOrderId: string;
    deliveryDate?: string;
    status?: string;
    notes?: string;
  }): Promise<any> => {
    const res = await apiClient.post<any>('/deliveries', payload);
    return res.data;
  },

  update: async (id: string, payload: {
    deliveryDate?: string;
    status?: string;
    receivedById?: string;
    notes?: string;
  }): Promise<any> => {
    const res = await apiClient.patch<any>(`/deliveries/${id}`, payload);
    return res.data;
  },
};
