import apiClient from './client';
import type { Valuation, CreateValuationPayload, UpdateValuationPayload } from '@/types/valuation.types';

type Raw = Record<string, any>;

// Valuation docs are returned lean with `_id` (no `id` normalise in the service).
function idify(d: Raw): Valuation {
  const { _id, id, ...rest } = d;
  return { ...(rest as Valuation), id: (id ?? _id) as string };
}

export const valuationsApi = {
  list: async (params?: { projectId?: string }): Promise<Valuation[]> => {
    const res = await apiClient.get<Raw[]>('/valuations', { params });
    return Array.isArray(res.data) ? res.data.map(idify) : [];
  },

  create: async (payload: CreateValuationPayload): Promise<Valuation> => {
    const res = await apiClient.post<Raw>('/valuations', payload);
    return idify(res.data);
  },

  update: async (id: string, payload: UpdateValuationPayload): Promise<Valuation> => {
    const res = await apiClient.patch<Raw>(`/valuations/${id}`, payload);
    return idify(res.data);
  },

  certify: async (id: string): Promise<Valuation> => {
    const res = await apiClient.post<Raw>(`/valuations/${id}/certify`);
    return idify(res.data);
  },
};
