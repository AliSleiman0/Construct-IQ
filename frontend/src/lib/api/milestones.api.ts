import apiClient from './client';

export const milestonesApi = {
  listByProject: async (projectId: string): Promise<any[]> => {
    const res = await apiClient.get<any[]>(`/projects/${projectId}/milestones`);
    return res.data;
  },

  create: async (projectId: string, payload: {
    name: string;
    description?: string;
    phaseId?: string;
    targetDate?: string;
    status?: string;
    percentComplete?: number;
  }): Promise<any> => {
    const res = await apiClient.post<any>(`/projects/${projectId}/milestones`, payload);
    return res.data;
  },

  update: async (projectId: string, milestoneId: string, payload: Partial<{
    name: string;
    description: string;
    phaseId: string;
    targetDate: string;
    status: string;
    percentComplete: number;
  }>): Promise<any> => {
    const res = await apiClient.patch<any>(`/projects/${projectId}/milestones/${milestoneId}`, payload);
    return res.data;
  },

  delete: async (projectId: string, milestoneId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/milestones/${milestoneId}`);
  },
};
