import apiClient from './client';
import type {
  User,
  Role,
  CreateUserPayload,
  UpdateUserPayload,
  UpdateMyProfilePayload,
  CreateOrgAdminPayload,
} from '@/types/user.types';

export const usersApi = {
  list: async (): Promise<User[]> => {
    const res = await apiClient.get<User[]>('/users');
    return res.data;
  },

  getById: async (id: string): Promise<User> => {
    const res = await apiClient.get<User>(`/users/${id}`);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/users/me');
    return res.data;
  },

  updateMe: async (payload: UpdateMyProfilePayload): Promise<User> => {
    const res = await apiClient.patch<User>('/users/me', payload);
    return res.data;
  },

  listRoles: async (): Promise<Role[]> => {
    const res = await apiClient.get<Role[]>('/users/roles');
    return res.data;
  },

  create: async (payload: CreateUserPayload): Promise<User> => {
    const res = await apiClient.post<User>('/users', payload);
    return res.data;
  },

  createOrgAdmin: async (payload: CreateOrgAdminPayload): Promise<User> => {
    const res = await apiClient.post<User>('/users/org-admins', payload);
    return res.data;
  },

  listOrgAdmins: async (): Promise<User[]> => {
    const res = await apiClient.get<User[]>('/users/org-admins');
    return res.data;
  },

  update: async (id: string, payload: UpdateUserPayload): Promise<User> => {
    const res = await apiClient.patch<User>(`/users/${id}`, payload);
    return res.data;
  },

  deactivate: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  assignRole: async (userId: string, roleId: string): Promise<void> => {
    await apiClient.post(`/users/${userId}/roles`, { roleId });
  },

  removeRole: async (userId: string, roleId: string): Promise<void> => {
    await apiClient.delete(`/users/${userId}/roles/${roleId}`);
  },
};
