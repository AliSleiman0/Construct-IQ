import apiClient from './client';

export const documentsApi = {
  list: async (params?: { projectId?: string; type?: string }): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/documents', { params });
    return res.data;
  },

  getById: async (id: string): Promise<any> => {
    const res = await apiClient.get<any>(`/documents/${id}`);
    return res.data;
  },

  create: async (payload: {
    name: string;
    fileKey: string;
    type?: string;
    projectId?: string;
    dailyReportId?: string;
    issueId?: string;
    description?: string;
    fileUrl?: string;
    mimeType?: string;
    sizeBytes?: number;
  }): Promise<any> => {
    const res = await apiClient.post<any>('/documents', payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },
};
