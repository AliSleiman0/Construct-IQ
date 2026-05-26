import apiClient from './client';
import type { DailyReport, CreateReportPayload, UpdateReportPayload } from '@/types/report.types';

type Raw = Record<string, any>;

// Mirrors tasks.api.ts `normalise`: the backend serialises Mongoose docs with
// `_id`, so map it to `id` (the shape the frontend `DailyReport` type expects).
function normalise(t: Raw): DailyReport {
  const { _id, id, ...rest } = t;
  return { ...(rest as DailyReport), id: (id ?? _id) as string };
}

export interface PagedReports {
  items: DailyReport[];
  total: number;
  limit: number;
  skip: number;
}

export const reportsApi = {
  // Array-returning list for the project-detail Reports tab. The endpoint is now
  // paginated, so read `.items` and request a high limit (one report per project
  // per day, so a single project's history stays well under this).
  list: async (params?: { projectId?: string }): Promise<DailyReport[]> => {
    const res = await apiClient.get<{ items: Raw[] }>('/reports', {
      params: { ...params, limit: 200 },
    });
    return (res.data.items ?? []).map(normalise);
  },

  // Paginated + date-filterable list for the standalone reports board.
  listPaged: async (params: {
    projectId?: string;
    from?: string;
    to?: string;
    limit?: number;
    skip?: number;
  }): Promise<PagedReports> => {
    const res = await apiClient.get<{ items: Raw[]; total: number; limit: number; skip: number }>(
      '/reports',
      { params },
    );
    return { ...res.data, items: (res.data.items ?? []).map(normalise) };
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
