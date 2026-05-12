import apiClient from './client';
import type { OrgDashboardData } from '@/types/dashboard.types';

export const dashboardApi = {
  getOrgDashboard: async (): Promise<OrgDashboardData> => {
    const res = await apiClient.get<OrgDashboardData>('/dashboard/org');
    return res.data;
  },
};
