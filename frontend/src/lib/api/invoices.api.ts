import apiClient from './client';

export const invoicesApi = {
  list: async (): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/invoices');
    return res.data;
  },

  create: async (payload: {
    organizationId: string;
    planId: string;
    number: string;
    amountUsd: number;
    issuedAt: string;
    dueAt: string;
    status?: string;
    notes?: string;
  }): Promise<any> => {
    const res = await apiClient.post<any>('/invoices', payload);
    return res.data;
  },

  update: async (id: string, payload: { status?: string; notes?: string }): Promise<any> => {
    const res = await apiClient.patch<any>(`/invoices/${id}`, payload);
    return res.data;
  },
};
