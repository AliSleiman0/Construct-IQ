import apiClient from './client';

export interface OrgListItem {
  id: string;
  name: string;
  slug: string;
  shortName?: string | null;
  industry?: string | null;
  size?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  maxUsers?: number | null;
  planId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { users: number; projects: number };
}

export interface CreateOrgPayload {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  website?: string;
  maxUsers?: number;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface UpdateOrgPayload {
  name?: string;
  slug?: string;
  shortName?: string | null;
  industry?: string | null;
  size?: string | null;
  description?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  maxUsers?: number | null;
}

export const organizationsApi = {
  list: async (): Promise<OrgListItem[]> => {
    const res = await apiClient.get<OrgListItem[]>('/organizations');
    return res.data;
  },

  create: async (payload: CreateOrgPayload): Promise<{ org: OrgListItem; adminUser: { id: string; email: string } }> => {
    const res = await apiClient.post('/organizations', payload);
    return res.data;
  },

  update: async (id: string, payload: UpdateOrgPayload): Promise<OrgListItem> => {
    const res = await apiClient.patch<OrgListItem>(`/organizations/${id}`, payload);
    return res.data;
  },

  setActive: async (id: string, isActive: boolean): Promise<{ id: string; name: string; isActive: boolean }> => {
    const res = await apiClient.patch(`/organizations/${id}/status`, { isActive });
    return res.data;
  },

  getStats: async (id: string): Promise<{ totalUsers: number; totalProjects: number; activeProjects: number }> => {
    const res = await apiClient.get(`/organizations/${id}/stats`);
    return res.data;
  },

  getById: async (id: string): Promise<OrgListItem> => {
    const res = await apiClient.get<OrgListItem>(`/organizations/${id}`);
    return res.data;
  },

  setPlan: async (id: string, planId: string | null): Promise<{ id: string; name: string; planId: string | null }> => {
    const res = await apiClient.patch(`/organizations/${id}/plan`, { planId });
    return res.data;
  },

  uploadLogo: async (id: string, file: File): Promise<OrgListItem> => {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<OrgListItem>(`/organizations/${id}/logo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};
