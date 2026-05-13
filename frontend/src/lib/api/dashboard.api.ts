import apiClient from './client';
import type { DashboardStats } from '@/types/dashboard.types';
import type { Project } from '@/types/project.types';

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get<DashboardStats>('/dashboard/stats');
    return res.data;
  },

  getRecentProjects: async (): Promise<Project[]> => {
    const res = await apiClient.get<Project[]>('/dashboard/recent-projects');
    return res.data;
  },
};
