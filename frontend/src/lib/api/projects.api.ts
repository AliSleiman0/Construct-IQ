import apiClient from './client';
import type { Project, CreateProjectPayload, UpdateProjectPayload, AddMemberPayload, UpdateMemberPayload, ProjectMember } from '@/types/project.types';

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const res = await apiClient.get<Project[]>('/projects');
    return res.data;
  },

  getById: async (id: string): Promise<Project> => {
    const res = await apiClient.get<Project>(`/projects/${id}`);
    return res.data;
  },

  create: async (payload: CreateProjectPayload): Promise<Project> => {
    const res = await apiClient.post<Project>('/projects', payload);
    return res.data;
  },

  update: async (id: string, payload: UpdateProjectPayload): Promise<Project> => {
    const res = await apiClient.patch<Project>(`/projects/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },

  addMember: async (projectId: string, payload: AddMemberPayload): Promise<ProjectMember> => {
    const res = await apiClient.post<ProjectMember>(`/projects/${projectId}/members`, payload);
    return res.data;
  },

  updateMember: async (projectId: string, userId: string, payload: UpdateMemberPayload): Promise<ProjectMember> => {
    const res = await apiClient.patch<ProjectMember>(`/projects/${projectId}/members/${userId}`, payload);
    return res.data;
  },

  removeMember: async (projectId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/members/${userId}`);
  },

  getClientPortalInfo: async (projectId: string): Promise<{ token: string | null; enabled: boolean }> => {
    const res = await apiClient.get(`/projects/${projectId}/client-portal`);
    return res.data;
  },

  regenerateClientPortalToken: async (projectId: string): Promise<{ token: string; enabled: boolean }> => {
    const res = await apiClient.post(`/projects/${projectId}/client-portal/regenerate`);
    return res.data;
  },

  toggleClientPortal: async (projectId: string, enabled: boolean): Promise<{ token: string; enabled: boolean }> => {
    const res = await apiClient.patch(`/projects/${projectId}/client-portal/toggle`, { enabled });
    return res.data;
  },
};
