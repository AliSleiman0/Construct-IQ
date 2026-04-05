import apiClient from './client';
import type { User, Role, CreateUserPayload, UpdateUserPayload } from '@/types/user.types';

export const usersApi = {
  list: async (): Promise<User[]> => {
    const res = await apiClient.get<User[]>('/users');
    return res.data;
  },

  getById: async (id: string): Promise<User> => {
    const res = await apiClient.get<User>(`/users/${id}`);
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
