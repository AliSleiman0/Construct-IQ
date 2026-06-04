import axios from 'axios';

export interface AutocadDrawing {
  id: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string;
  apsUrn: string | null;
  translationStatus: 'pending' | 'processing' | 'success' | 'failed' | 'not_configured' | 'upload_failed';
}

export interface AutocadPortalData {
  project: {
    name: string;
    description: string | null;
    status: string;
    code: string | null;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  drawings: AutocadDrawing[];
  apsConfigured: boolean;
}

export interface AutocadLinkInfo {
  token: string | null;
  enabled: boolean;
  apsConfigured: boolean;
}

export interface ViewerTokenResponse {
  access_token: string;
  expires_in: number;
}

const publicClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

publicClient.interceptors.response.use((response) => {
  if (response.data?.success !== undefined) {
    return { ...response, data: response.data.data };
  }
  return response;
});

export const autocadApi = {
  getPortalData: async (token: string): Promise<AutocadPortalData> => {
    const res = await publicClient.get(`/public/autocad/${token}`);
    return res.data;
  },

  uploadDrawing: async (token: string, file: File): Promise<AutocadDrawing> => {
    const form = new FormData();
    form.append('file', file);
    const res = await publicClient.post(`/public/autocad/${token}/drawings`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  refreshDrawingStatus: async (token: string, drawingId: string): Promise<{ translationStatus: string }> => {
    const res = await publicClient.get(`/public/autocad/${token}/drawings/${drawingId}/status`);
    return res.data;
  },

  getViewerToken: async (): Promise<ViewerTokenResponse> => {
    const res = await publicClient.get('/public/autocad/viewer-token');
    return res.data;
  },
};
