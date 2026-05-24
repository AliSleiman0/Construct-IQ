import apiClient from './client';
import type { PurchaseOrder, CreatePurchaseOrderPayload } from '@/types/procurement.types';

type Raw = Record<string, any>;
function idify(d: Raw): PurchaseOrder {
  const { _id, id, ...rest } = d;
  return { ...(rest as PurchaseOrder), id: (id ?? _id) as string };
}

export const purchaseOrdersApi = {
  list: async (params?: { projectId?: string }): Promise<PurchaseOrder[]> => {
    const res = await apiClient.get<Raw[]>('/purchase-orders', { params });
    return (res.data ?? []).map(idify);
  },

  getById: async (id: string): Promise<PurchaseOrder> => {
    const res = await apiClient.get<Raw>(`/purchase-orders/${id}`);
    return idify(res.data);
  },

  create: async (payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> => {
    const res = await apiClient.post<Raw>('/purchase-orders', payload);
    return idify(res.data);
  },

  update: async (id: string, payload: Partial<CreatePurchaseOrderPayload>): Promise<PurchaseOrder> => {
    const res = await apiClient.patch<Raw>(`/purchase-orders/${id}`, payload);
    return idify(res.data);
  },

  approve: async (id: string): Promise<PurchaseOrder> => {
    const res = await apiClient.post<Raw>(`/purchase-orders/${id}/approve`);
    return idify(res.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/purchase-orders/${id}`);
  },
};
