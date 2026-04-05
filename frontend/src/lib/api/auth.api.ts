import apiClient from './client';
import type { AuthUser, LoginCredentials, LoginResponse } from '@/types/auth.types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  refresh: async (): Promise<void> => {
    await apiClient.post('/auth/refresh');
  },

  getMe: async (): Promise<AuthUser> => {
    const response = await apiClient.get<AuthUser>('/auth/me');
    return response.data;
  },
};
