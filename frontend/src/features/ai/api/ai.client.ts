import apiClient from '@/lib/api/client';
import type { AiChatRequest, AiChatResponse } from '../types';

export const aiApi = {
  chat: async (payload: AiChatRequest): Promise<AiChatResponse> => {
    const res = await apiClient.post<AiChatResponse>('/ai/chat', payload);
    return res.data;
  },

  summarizeReport: async (reportId: string): Promise<{ summary: string }> => {
    const res = await apiClient.post<{ summary: string }>(`/ai/summarize-report/${reportId}`);
    return res.data;
  },
};
