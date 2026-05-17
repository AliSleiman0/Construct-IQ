import apiClient from './client';

export interface AiPlanPayload {
  name: string;
  tier: string;
  pricePerMonth: number;
  description?: string;
  features?: string[];
  isPopular?: boolean;
  isActive?: boolean;
}

export const aiPlansApi = {
  list: async (includeInactive = false): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/ai-plans', {
      params: includeInactive ? { includeInactive: 'true' } : {},
    });
    return res.data;
  },

  create: async (payload: AiPlanPayload): Promise<any> => {
    const res = await apiClient.post<any>('/ai-plans', payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<AiPlanPayload>): Promise<any> => {
    const res = await apiClient.patch<any>(`/ai-plans/${id}`, payload);
    return res.data;
  },

  remove: async (id: string): Promise<any> => {
    const res = await apiClient.delete<any>(`/ai-plans/${id}`);
    return res.data;
  },
};
