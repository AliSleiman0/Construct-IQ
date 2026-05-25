import apiClient from './client';
import type {
  MaterialRequest,
  CreateMaterialRequestPayload,
  ReviewMaterialRequestPayload,
  ConvertMaterialRequestPayload,
} from '@/types/procurement.types';

type Raw = Record<string, any>;
function idify(d: Raw): MaterialRequest {
  const { _id, id, ...rest } = d;
  return { ...(rest as MaterialRequest), id: (id ?? _id) as string };
}

export const materialRequestsApi = {
  list: async (params?: { projectId?: string }): Promise<MaterialRequest[]> => {
    const res = await apiClient.get<Raw[]>('/material-requests', { params });
    return (res.data ?? []).map(idify);
  },

  getById: async (id: string): Promise<MaterialRequest> => {
    const res = await apiClient.get<Raw>(`/material-requests/${id}`);
    return idify(res.data);
  },

  create: async (payload: CreateMaterialRequestPayload): Promise<MaterialRequest> => {
    const res = await apiClient.post<Raw>('/material-requests', payload);
    return idify(res.data);
  },

  update: async (id: string, payload: Partial<CreateMaterialRequestPayload>): Promise<MaterialRequest> => {
    const res = await apiClient.patch<Raw>(`/material-requests/${id}`, payload);
    return idify(res.data);
  },

  approve: async (id: string, payload?: ReviewMaterialRequestPayload): Promise<MaterialRequest> => {
    const res = await apiClient.post<Raw>(`/material-requests/${id}/approve`, payload ?? {});
    return idify(res.data);
  },

  reject: async (id: string, payload?: ReviewMaterialRequestPayload): Promise<MaterialRequest> => {
    const res = await apiClient.post<Raw>(`/material-requests/${id}/reject`, payload ?? {});
    return idify(res.data);
  },

  convert: async (id: string, payload: ConvertMaterialRequestPayload): Promise<MaterialRequest> => {
    const res = await apiClient.post<Raw>(`/material-requests/${id}/convert`, payload);
    return idify(res.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/material-requests/${id}`);
  },
};
