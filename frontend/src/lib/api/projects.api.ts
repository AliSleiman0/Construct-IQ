import apiClient from './client';
import type { Project, CreateProjectPayload, UpdateProjectPayload, AddMemberPayload, ProjectMember } from '@/types/project.types';

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

  removeMember: async (projectId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/members/${userId}`);
  },
};
