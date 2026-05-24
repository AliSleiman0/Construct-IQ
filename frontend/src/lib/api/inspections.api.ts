import apiClient from './client';
import type {
  Inspection,
  CreateInspectionPayload,
  UpdateInspectionPayload,
  InspectionListParams,
} from '@/types/inspection.types';

type Raw = Record<string, any>;

// The backend serialises Mongoose docs with `_id`; map to `id` (mirrors issues.api).
function normalise(d: Raw): Inspection {
  const { _id, id, ...rest } = d;
  return { ...(rest as Inspection), id: (id ?? _id) as string };
}

export const inspectionsApi = {
  list: async (params?: InspectionListParams): Promise<Inspection[]> => {
    const res = await apiClient.get<Raw[]>('/inspections', { params });
    return Array.isArray(res.data) ? res.data.map(normalise) : [];
  },

  getById: async (id: string): Promise<Inspection> => {
    const res = await apiClient.get<Raw>(`/inspections/${id}`);
    return normalise(res.data);
  },

  create: async (payload: CreateInspectionPayload): Promise<Inspection> => {
    const res = await apiClient.post<Raw>('/inspections', payload);
    return normalise(res.data);
  },

  update: async (id: string, payload: UpdateInspectionPayload): Promise<Inspection> => {
    const res = await apiClient.patch<Raw>(`/inspections/${id}`, payload);
    return normalise(res.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/inspections/${id}`);
  },
};
