import apiClient from './client';
import type { Variation, CreateVariationPayload, UpdateVariationPayload } from '@/types/variation.types';

type Raw = Record<string, any>;

// Variation docs are returned lean with `_id` (no `id` normalise in the service).
function idify(d: Raw): Variation {
  const { _id, id, ...rest } = d;
  return { ...(rest as Variation), id: (id ?? _id) as string };
}

export const variationsApi = {
  list: async (params?: { projectId?: string }): Promise<Variation[]> => {
    const res = await apiClient.get<Raw[]>('/variations', { params });
    return Array.isArray(res.data) ? res.data.map(idify) : [];
  },

  create: async (payload: CreateVariationPayload): Promise<Variation> => {
    const res = await apiClient.post<Raw>('/variations', payload);
    return idify(res.data);
  },

  update: async (id: string, payload: UpdateVariationPayload): Promise<Variation> => {
    const res = await apiClient.patch<Raw>(`/variations/${id}`, payload);
    return idify(res.data);
  },

  approve: async (id: string): Promise<Variation> => {
    const res = await apiClient.post<Raw>(`/variations/${id}/approve`);
    return idify(res.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/variations/${id}`);
  },
};
