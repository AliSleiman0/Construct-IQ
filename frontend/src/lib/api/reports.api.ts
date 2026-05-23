import apiClient from './client';
import type { DailyReport, CreateReportPayload, UpdateReportPayload } from '@/types/report.types';

type Raw = Record<string, any>;

// Mirrors tasks.api.ts `normalise`: the backend serialises Mongoose docs with
// `_id`, so map it to `id` (the shape the frontend `DailyReport` type expects).
function normalise(t: Raw): DailyReport {
  const { _id, id, ...rest } = t;
  return { ...(rest as DailyReport), id: (id ?? _id) as string };
}

export const reportsApi = {
  list: async (params?: { projectId?: string }): Promise<DailyReport[]> => {
    const res = await apiClient.get<Raw[]>('/reports', { params });
    return (res.data ?? []).map(normalise);
  },

  getById: async (id: string): Promise<DailyReport> => {
    const res = await apiClient.get<Raw>(`/reports/${id}`);
    return normalise(res.data);
  },

  create: async (payload: CreateReportPayload): Promise<DailyReport> => {
    const res = await apiClient.post<Raw>('/reports', payload);
    return normalise(res.data);
  },

  update: async (id: string, payload: UpdateReportPayload): Promise<DailyReport> => {
    const res = await apiClient.patch<Raw>(`/reports/${id}`, payload);
    return normalise(res.data);
  },
};
