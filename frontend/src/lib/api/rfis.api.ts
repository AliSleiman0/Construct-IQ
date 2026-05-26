import apiClient from './client';
import type {
  Rfi,
  CreateRfiPayload,
  UpdateRfiPayload,
  AnswerRfiPayload,
  RfiListParams,
} from '@/types/rfi.types';

type Raw = Record<string, any>;

// The backend serialises Mongoose docs with `_id`; map to `id` (mirrors inspections.api).
function normalise(d: Raw): Rfi {
  const { _id, id, ...rest } = d;
  return { ...(rest as Rfi), id: (id ?? _id) as string };
}

export const rfisApi = {
  list: async (params?: RfiListParams): Promise<Rfi[]> => {
    const res = await apiClient.get<Raw[]>('/rfis', { params });
    return Array.isArray(res.data) ? res.data.map(normalise) : [];
  },

  getById: async (id: string): Promise<Rfi> => {
    const res = await apiClient.get<Raw>(`/rfis/${id}`);
    return normalise(res.data);
  },

  create: async (payload: CreateRfiPayload): Promise<Rfi> => {
    const res = await apiClient.post<Raw>('/rfis', payload);
    return normalise(res.data);
  },

  update: async (id: string, payload: UpdateRfiPayload): Promise<Rfi> => {
    const res = await apiClient.patch<Raw>(`/rfis/${id}`, payload);
    return normalise(res.data);
  },

  answer: async (id: string, payload: AnswerRfiPayload): Promise<Rfi> => {
    const res = await apiClient.post<Raw>(`/rfis/${id}/answer`, payload);
    return normalise(res.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/rfis/${id}`);
  },
};
