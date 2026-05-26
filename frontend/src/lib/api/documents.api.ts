import apiClient from './client';
import type { ProjectDocument } from '@/types/document.types';

type Raw = Record<string, any>;
function idify(d: Raw): ProjectDocument {
  const { _id, id, ...rest } = d;
  return { ...(rest as ProjectDocument), id: (id ?? _id) as string };
}

export const documentsApi = {
  list: async (params?: { projectId?: string; type?: string; dailyReportId?: string }): Promise<ProjectDocument[]> => {
    const res = await apiClient.get<Raw[]>('/documents', { params });
    return (res.data ?? []).map(idify);
  },

  getById: async (id: string): Promise<ProjectDocument> => {
    const res = await apiClient.get<Raw>(`/documents/${id}`);
    return idify(res.data);
  },

  // Multipart upload → S3 → Document record. `meta` fields ride alongside the file.
  upload: async (
    file: File,
    meta: { projectId?: string; type?: string; name?: string; description?: string; dailyReportId?: string },
  ): Promise<ProjectDocument> => {
    const form = new FormData();
    form.append('file', file);
    if (meta.projectId) form.append('projectId', meta.projectId);
    if (meta.dailyReportId) form.append('dailyReportId', meta.dailyReportId);
    if (meta.type) form.append('type', meta.type);
    if (meta.name) form.append('name', meta.name);
    if (meta.description) form.append('description', meta.description);
    const res = await apiClient.post<Raw>('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return idify(res.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },
};
