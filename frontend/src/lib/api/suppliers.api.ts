import apiClient from './client';
import type { Supplier, CreateSupplierPayload } from '@/types/procurement.types';

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  totalValue: number;
  deliveredOrders: number;
  deliveriesTracked: number;
  onTimeDeliveries: number;
  onTimeRate: number | null;
}

type Raw = Record<string, any>;
function idify(d: Raw): Supplier {
  const { _id, id, ...rest } = d;
  return { ...(rest as Supplier), id: (id ?? _id) as string };
}

export const suppliersApi = {
  list: async (): Promise<Supplier[]> => {
    const res = await apiClient.get<Raw[]>('/suppliers');
    return (res.data ?? []).map(idify);
  },

  getById: async (id: string): Promise<Supplier> => {
    const res = await apiClient.get<Raw>(`/suppliers/${id}`);
    return idify(res.data);
  },

  create: async (payload: CreateSupplierPayload): Promise<Supplier> => {
    const res = await apiClient.post<Raw>('/suppliers', payload);
    return idify(res.data);
  },

  update: async (id: string, payload: Partial<CreateSupplierPayload>): Promise<Supplier> => {
    const res = await apiClient.patch<Raw>(`/suppliers/${id}`, payload);
    return idify(res.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },

  getPerformance: async (id: string): Promise<SupplierPerformance> => {
    const res = await apiClient.get<SupplierPerformance>(`/suppliers/${id}/performance`);
    return res.data;
  },
};
