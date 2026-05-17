import apiClient from './client';

export interface PlatformAiFeature {
  _id: string;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiFeaturePayload {
  key: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export const aiFeaturesApi = {
  list: async (includeInactive = false): Promise<PlatformAiFeature[]> => {
    const res = await apiClient.get<PlatformAiFeature[]>('/ai-features', {
      params: includeInactive ? { includeInactive: 'true' } : {},
    });
    return res.data;
  },

  create: async (payload: CreateAiFeaturePayload): Promise<PlatformAiFeature> => {
    const res = await apiClient.post<PlatformAiFeature>('/ai-features', payload);
    return res.data;
  },

  update: async (
    id: string,
    payload: Partial<CreateAiFeaturePayload>,
  ): Promise<PlatformAiFeature> => {
    const res = await apiClient.patch<PlatformAiFeature>(`/ai-features/${id}`, payload);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/ai-features/${id}`);
  },
};
