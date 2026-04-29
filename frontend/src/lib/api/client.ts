import axios, { AxiosError, AxiosResponse } from 'axios';
import { MOCK_MODE } from '@/lib/mock/mode';
import { mockAdapter } from '@/lib/mock/mock-client';
import { useCompanyStore } from '@/store/company.store';

// API_BASE points to the Next.js rewrite prefix
// All calls go through /api/v1/* which proxies to the NestJS backend
const API_BASE = '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Send cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mock mode toggle — keeps non-auth modules functional during incremental
// migration from POC mocks to real backend. Auth always uses the real backend.
if (MOCK_MODE) {
  apiClient.defaults.adapter = mockAdapter;
}

// Request interceptor — inject X-Organization-Id from the company store
// (non-httpOnly cookie + localStorage mirror managed by useCompanyStore).
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const orgId = useCompanyStore.getState().selectedCompany?.id;
    if (orgId) {
      config.headers['X-Organization-Id'] = orgId;
    }
  }
  return config;
});

// Response interceptor — unwrap the `data` envelope from the API
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Backend wraps responses in { success, data, timestamp }
    if (response.data?.success !== undefined) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Never retry if the failing request IS the refresh endpoint — avoids infinite loop
    const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');

    // Auto-refresh on 401 — only retry once, never on the refresh call itself
    if (error.response?.status === 401 && !originalRequest._retried && !isRefreshRequest) {
      originalRequest._retried = true;
      try {
        await apiClient.post('/auth/refresh');
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — clear the logged_in flag so middleware won't bounce back
        if (typeof window !== 'undefined') {
          document.cookie = 'logged_in=; Max-Age=0; path=/';
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
