import apiClient from './client';

export const phasesApi = {
  listByProject: async (projectId: string): Promise<any[]> => {
    const res = await apiClient.get<any[]>(`/projects/${projectId}/phases`);
    return res.data;
  },

  create: async (projectId: string, payload: {
    name: string;
    description?: string;
    order?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<any> => {
    const res = await apiClient.post<any>(`/projects/${projectId}/phases`, payload);
    return res.data;
  },

  update: async (projectId: string, phaseId: string, payload: Partial<{
    name: string;
    description: string;
    order: number;
    startDate: string;
    endDate: string;
    status: string;
  }>): Promise<any> => {
    const res = await apiClient.patch<any>(`/projects/${projectId}/phases/${phaseId}`, payload);
    return res.data;
  },

  delete: async (projectId: string, phaseId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/phases/${phaseId}`);
  },
};
