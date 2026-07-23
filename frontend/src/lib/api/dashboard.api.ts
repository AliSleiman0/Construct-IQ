import apiClient from './client';
import type { ClientDashboardData, DashboardStats, OrgDashboardData, PmDashboardData, SiteEngDashboardData, SurveyorDashboardData } from '@/types/dashboard.types';
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

  getOrgDashboard: async (): Promise<OrgDashboardData> => {
    const res = await apiClient.get<OrgDashboardData>('/dashboard/org');
    return res.data;
  },

  getPmDashboard: async (): Promise<PmDashboardData> => {
    const res = await apiClient.get<PmDashboardData>('/dashboard/pm');
    return res.data;
  },

  getSiteEngDashboard: async (): Promise<SiteEngDashboardData> => {
    const res = await apiClient.get<SiteEngDashboardData>('/dashboard/site-eng');
    return res.data;
  },

  getClientDashboard: async (): Promise<ClientDashboardData> => {
    const res = await apiClient.get<ClientDashboardData>('/dashboard/client');
    return res.data;
  },

  getSurveyorDashboard: async (): Promise<SurveyorDashboardData> => {
    const res = await apiClient.get<SurveyorDashboardData>('/dashboard/surveyor');
    return res.data;
  },
};
