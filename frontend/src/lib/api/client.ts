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

// Auth endpoints whose 401 must NOT trigger refresh-and-retry. /auth/login
// 401 means wrong credentials, not session expiry — auto-refreshing would
// reload the page and swallow the inline error. /auth/refresh is excluded
// to avoid a refresh loop. /auth/logout is excluded because we're already
// tearing down state.
const NO_REFRESH_ON_401 = ['/auth/login', '/auth/refresh', '/auth/logout'];

const isNoRefreshUrl = (url: string | undefined): boolean =>
  !!url && NO_REFRESH_ON_401.some((p) => url.includes(p));

// Singleton refresh promise — concurrent 401s wait on the same refresh
// instead of each firing their own. The backend rotates refresh tokens
// (see auth.service.ts), so parallel refreshes would race: only the first
// gets a fresh token, the rest 401 and force-logout the user.
let refreshInFlight: Promise<unknown> | null = null;

const refreshOnce = (): Promise<unknown> => {
  if (!refreshInFlight) {
    refreshInFlight = apiClient.post('/auth/refresh').finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

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

    if (
      error.response?.status === 401 &&
      !originalRequest._retried &&
      !isNoRefreshUrl(originalRequest?.url)
    ) {
      originalRequest._retried = true;
      try {
        await refreshOnce();
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — clear stale `logged_in` so middleware won't
        // bounce us back through /post-login, then go to /login.
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
