import apiClient from './client';

export interface PlatformFeature {
  _id: string;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeaturePayload {
  key: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export const featuresApi = {
  list: async (includeInactive = false): Promise<PlatformFeature[]> => {
    const res = await apiClient.get<PlatformFeature[]>('/features', {
      params: includeInactive ? { includeInactive: 'true' } : {},
    });
    return res.data;
  },

  create: async (payload: CreateFeaturePayload): Promise<PlatformFeature> => {
    const res = await apiClient.post<PlatformFeature>('/features', payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<CreateFeaturePayload>): Promise<PlatformFeature> => {
    const res = await apiClient.patch<PlatformFeature>(`/features/${id}`, payload);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/features/${id}`);
  },
};
