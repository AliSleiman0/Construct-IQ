import apiClient from './client';
import type {
  Delivery,
  CreateDeliveryPayload,
  UpdateDeliveryPayload,
  ConfirmDeliveryPayload,
} from '@/types/procurement.types';

type Raw = Record<string, any>;
function idify(d: Raw): Delivery {
  const { _id, id, ...rest } = d;
  return { ...(rest as Delivery), id: (id ?? _id) as string };
}

export const deliveriesApi = {
  list: async (): Promise<Delivery[]> => {
    const res = await apiClient.get<Raw[]>('/deliveries');
    return (res.data ?? []).map(idify);
  },

  getById: async (id: string): Promise<Delivery> => {
    const res = await apiClient.get<Raw>(`/deliveries/${id}`);
    return idify(res.data);
  },

  create: async (payload: CreateDeliveryPayload): Promise<Delivery> => {
    const res = await apiClient.post<Raw>('/deliveries', payload);
    return idify(res.data);
  },

  update: async (id: string, payload: UpdateDeliveryPayload): Promise<Delivery> => {
    const res = await apiClient.patch<Raw>(`/deliveries/${id}`, payload);
    return idify(res.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/deliveries/${id}`);
  },

  confirm: async (id: string, payload: ConfirmDeliveryPayload): Promise<Delivery> => {
    const res = await apiClient.post<Raw>(`/deliveries/${id}/confirm`, payload);
    return idify(res.data);
  },
};
