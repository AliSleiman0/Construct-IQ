import apiClient from './client';
import type { DailyReport, CreateReportPayload, UpdateReportPayload } from '@/types/report.types';

export const reportsApi = {
  listByProject: async (projectId: string): Promise<DailyReport[]> => {
    const res = await apiClient.get<DailyReport[]>(`/projects/${projectId}/reports`);
    return res.data;
  },

  getById: async (id: string): Promise<DailyReport> => {
    const res = await apiClient.get<DailyReport>(`/reports/${id}`);
    return res.data;
  },

  create: async (projectId: string, payload: CreateReportPayload): Promise<DailyReport> => {
    const res = await apiClient.post<DailyReport>(`/projects/${projectId}/reports`, payload);
    return res.data;
  },

  update: async (id: string, payload: UpdateReportPayload): Promise<DailyReport> => {
    const res = await apiClient.patch<DailyReport>(`/reports/${id}`, payload);
    return res.data;
  },
};
