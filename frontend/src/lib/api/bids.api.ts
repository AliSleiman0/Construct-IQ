import apiClient from './client';
import type { Bid, UploadBidsPayload } from '@/types/bids.types';

type Raw = Record<string, any>;
function idify(d: Raw): Bid {
  const { _id, id, ...rest } = d;
  return { ...(rest as Bid), id: (id ?? _id) as string };
}

export const bidsApi = {
  list: async (params?: {
    projectId?: string;
    status?: string;
    tradePackage?: string;
  }): Promise<Bid[]> => {
    const res = await apiClient.get<Raw[]>('/bids', { params });
    return (res.data ?? []).map(idify);
  },

  getById: async (id: string): Promise<Bid> => {
    const res = await apiClient.get<Raw>(`/bids/${id}`);
    return idify(res.data);
  },

  // Multipart upload of N PDFs + projectId + tradePackage. Backend runs the
  // AI extraction synchronously and returns the array of bid records.
  upload: async (payload: UploadBidsPayload): Promise<Bid[]> => {
    const form = new FormData();
    form.append('projectId', payload.projectId);
    form.append('tradePackage', payload.tradePackage);
    for (const file of payload.files) {
      form.append('files', file);
    }
    const res = await apiClient.post<Raw[]>('/bids/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Extraction is wall-clock-bound by OpenAI; allow up to 3 minutes.
      timeout: 3 * 60 * 1000,
    });
    return (res.data ?? []).map(idify);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/bids/${id}`);
  },
};
