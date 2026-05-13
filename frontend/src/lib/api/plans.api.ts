import apiClient from './client';

export interface PlanPayload {
  name: string;
  tier: string;
  pricePerMonth: number;
  maxUsers: number;
  maxProjects: number;
  description?: string;
  features?: string[];
  isPopular?: boolean;
}

export const plansApi = {
  list: async (includeInactive = false): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/plans', {
      params: includeInactive ? { includeInactive: 'true' } : {},
    });
    return res.data;
  },

  create: async (payload: PlanPayload): Promise<any> => {
    const res = await apiClient.post<any>('/plans', payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<PlanPayload>): Promise<any> => {
    const res = await apiClient.patch<any>(`/plans/${id}`, payload);
    return res.data;
  },

  remove: async (id: string): Promise<any> => {
    const res = await apiClient.delete<any>(`/plans/${id}`);
    return res.data;
  },
};
