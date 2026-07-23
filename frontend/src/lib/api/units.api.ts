import apiClient from './client';
import type { Unit, UnitStatus } from '@/types/unit.types';

/**
 * Buyer-scoped server-side: a CLIENT only ever receives the units they bought,
 * regardless of query params (see `UnitViewer` in the backend units service).
 */

export const unitsApi = {
  list: async (params?: { projectId?: string; status?: UnitStatus }): Promise<Unit[]> => {
    const res = await apiClient.get<Unit[]>('/units', { params });
    return res.data;
  },

  getById: async (id: string): Promise<Unit> => {
    const res = await apiClient.get<Unit>(`/units/${id}`);
    return res.data;
  },

  create: async (payload: {
    projectId: string;
    label: string;
    floor: number;
    sqft: number;
    priceUsd: number;
    type?: string;
    bedrooms?: number;
    bathrooms?: number;
    position?: string;
    status?: string;
    buyerId?: string;
    imageUrl?: string;
    description?: string;
  }): Promise<Unit> => {
    const res = await apiClient.post<Unit>('/units', payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<Unit>): Promise<Unit> => {
    const res = await apiClient.patch<Unit>(`/units/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/units/${id}`);
  },
};
