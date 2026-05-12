import apiClient from './client';

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  description: string | null;
  location: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  totalBudget: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const res = await apiClient.get<Project[]>('/projects');
    return res.data;
  },

  getById: async (id: string): Promise<Project> => {
    const res = await apiClient.get<Project>(`/projects/${id}`);
    return res.data;
  },
};
