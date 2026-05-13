import apiClient from './client';

export const purchaseOrdersApi = {
  list: async (params?: { projectId?: string }): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/purchase-orders', { params });
    return res.data;
  },

  getById: async (id: string): Promise<any> => {
    const res = await apiClient.get<any>(`/purchase-orders/${id}`);
    return res.data;
  },

  create: async (payload: {
    projectId: string;
    supplierId: string;
    poNumber: string;
    orderDate: string;
    status?: string;
    totalAmount?: number;
    currency?: string;
    budgetLineId?: string;
    expectedDeliveryDate?: string;
    notes?: string;
    items?: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number; unit?: string; notes?: string }>;
  }): Promise<any> => {
    const res = await apiClient.post<any>('/purchase-orders', payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<any>): Promise<any> => {
    const res = await apiClient.patch<any>(`/purchase-orders/${id}`, payload);
    return res.data;
  },

  approve: async (id: string): Promise<any> => {
    const res = await apiClient.post<any>(`/purchase-orders/${id}/approve`);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/purchase-orders/${id}`);
  },
};
