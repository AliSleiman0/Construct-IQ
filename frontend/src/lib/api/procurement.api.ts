import apiClient from './client';

export interface ProcurementDashboardData {
  activeSuppliers: number;
  activePOs: number;
  poByStatus: Record<string, number>;
  monthlySpend: number;
  pendingDeliveries: number;
  materialRequests: { pending: number; approved: number };
  spendByCategory: { label: string; value: number }[];
  deliveriesThisWeek: { label: string; value: number }[];
}

export const procurementApi = {
  getDashboard: async (): Promise<ProcurementDashboardData> => {
    const res = await apiClient.get<ProcurementDashboardData>('/procurement/dashboard');
    return res.data;
  },
};
