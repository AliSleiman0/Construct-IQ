import apiClient from './client';

export const budgetApi = {
  getByProject: async (projectId: string): Promise<any> => {
    const res = await apiClient.get<any>('/budget', { params: { projectId } });
    return res.data;
  },

  create: async (payload: { projectId: string; totalAmount: number; currency?: string; notes?: string }): Promise<any> => {
    const res = await apiClient.post<any>('/budget', payload);
    return res.data;
  },

  update: async (id: string, payload: { totalAmount?: number; currency?: string; notes?: string }): Promise<any> => {
    const res = await apiClient.patch<any>(`/budget/${id}`, payload);
    return res.data;
  },

  addLine: async (budgetId: string, payload: { category: string; plannedAmount: number; description?: string; notes?: string }): Promise<any> => {
    const res = await apiClient.post<any>(`/budget/${budgetId}/lines`, payload);
    return res.data;
  },

  removeLine: async (budgetId: string, lineId: string): Promise<void> => {
    await apiClient.delete(`/budget/${budgetId}/lines/${lineId}`);
  },

  addExpense: async (budgetId: string, payload: { description: string; amount: number; date: string; budgetLineId?: string; currency?: string; reference?: string; notes?: string }): Promise<any> => {
    const res = await apiClient.post<any>(`/budget/${budgetId}/expenses`, payload);
    return res.data;
  },
};
