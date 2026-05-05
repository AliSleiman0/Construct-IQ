import apiClient from './client';

export const progressPhotosApi = {
  list: async (params?: { projectId?: string }): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/progress-photos', { params });
    return res.data;
  },

  create: async (payload: {
    projectId: string;
    url: string;
    takenAt: string;
    milestoneId?: string;
    caption?: string;
  }): Promise<any> => {
    const res = await apiClient.post<any>('/progress-photos', payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/progress-photos/${id}`);
  },
};
