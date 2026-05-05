import apiClient from './client';

export const auditLogsApi = {
  list: async (params?: {
    actorUserId?: string;
    entityType?: string;
    from?: string;
    to?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ items: any[]; total: number; limit: number; skip: number }> => {
    const res = await apiClient.get<any>('/audit-logs', { params });
    return res.data;
  },
};
