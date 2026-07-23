import apiClient from './client';
import type { ProgressPhoto } from '@/types/unit.types';

export const progressPhotosApi = {
  list: async (params?: { projectId?: string }): Promise<ProgressPhoto[]> => {
    const res = await apiClient.get<ProgressPhoto[]>('/progress-photos', { params });
    return res.data;
  },

  create: async (payload: {
    projectId: string;
    url: string;
    takenAt: string;
    milestoneId?: string;
    caption?: string;
  }): Promise<ProgressPhoto> => {
    const res = await apiClient.post<ProgressPhoto>('/progress-photos', payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/progress-photos/${id}`);
  },
};
