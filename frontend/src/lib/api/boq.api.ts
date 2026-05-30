import apiClient from './client';
import type { BoqItem, CreateBoqPayload, UpdateBoqPayload } from '@/types/boq.types';

type Raw = Record<string, any>;

// BOQ docs are returned lean with `_id` (no `id` normalise in the service).
function idify(d: Raw): BoqItem {
  const { _id, id, ...rest } = d;
  return { ...(rest as BoqItem), id: (id ?? _id) as string };
}

export const boqApi = {
  list: async (params?: { projectId?: string }): Promise<BoqItem[]> => {
    const res = await apiClient.get<Raw[]>('/boq', { params });
    return Array.isArray(res.data) ? res.data.map(idify) : [];
  },

  create: async (payload: CreateBoqPayload): Promise<BoqItem> => {
    const res = await apiClient.post<Raw>('/boq', payload);
    return idify(res.data);
  },

  update: async (id: string, payload: UpdateBoqPayload): Promise<BoqItem> => {
    const res = await apiClient.patch<Raw>(`/boq/${id}`, payload);
    return idify(res.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/boq/${id}`);
  },
};
