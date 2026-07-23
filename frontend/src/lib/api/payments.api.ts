import apiClient from './client';
import type { Payment, PaymentStatus } from '@/types/unit.types';

export const paymentsApi = {
  list: async (params?: { buyerId?: string; unitId?: string }): Promise<Payment[]> => {
    const res = await apiClient.get<Payment[]>('/payments', { params });
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
  }): Promise<Payment> => {
    const res = await apiClient.post<Payment>('/payments', payload);
    return res.data;
  },

  update: async (
    id: string,
    payload: { status?: PaymentStatus; paidAmountUsd?: number; dueDate?: string; invoiceNumber?: string },
  ): Promise<Payment> => {
    const res = await apiClient.patch<Payment>(`/payments/${id}`, payload);
    return res.data;
  },
};
