import apiClient from './client';

export const paymentsApi = {
  list: async (params?: { buyerId?: string; unitId?: string }): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/payments', { params });
    return res.data;
  },

  create: async (payload: {
    unitId: string;
    buyerId: string;
    installmentNo: number;
    totalInstallments: number;
    label: string;
    amountUsd: number;
    dueDate: string;
    invoiceNumber?: string;
  }): Promise<any> => {
    const res = await apiClient.post<any>('/payments', payload);
    return res.data;
  },

  update: async (id: string, payload: { status?: string; dueDate?: string; invoiceNumber?: string }): Promise<any> => {
    const res = await apiClient.patch<any>(`/payments/${id}`, payload);
    return res.data;
  },
};
