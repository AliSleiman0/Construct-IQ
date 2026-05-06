import apiClient from './client';

export const plansApi = {
  list: async (): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/plans');
    return res.data;
  },

  create: async (payload: {
    name: string;
    tier: string;
    pricePerMonth: number;
    maxUsers: number;
    maxProjects: number;
    description?: string;
    features?: string[];
    isPopular?: boolean;
  }): Promise<any> => {
    const res = await apiClient.post<any>('/plans', payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<{
    name: string;
    pricePerMonth: number;
    maxUsers: number;
    maxProjects: number;
    description: string;
    features: string[];
    isPopular: boolean;
  }>): Promise<any> => {
    const res = await apiClient.patch<any>(`/plans/${id}`, payload);
    return res.data;
  },
};
