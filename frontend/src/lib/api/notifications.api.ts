import apiClient from './client';

export const notificationsApi = {
  list: async (): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/notifications');
    return res.data;
  },

  markRead: async (id: string): Promise<any> => {
    const res = await apiClient.patch<any>(`/notifications/${id}/read`);
    return res.data;
  },

  markAllRead: async (): Promise<any> => {
    const res = await apiClient.post<any>('/notifications/mark-all-read');
    return res.data;
  },
};
