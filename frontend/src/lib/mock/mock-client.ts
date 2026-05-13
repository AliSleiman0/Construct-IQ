import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosHeaders } from 'axios';
import { usersHandler } from './handlers/users.handler';
import { orgsHandler } from './handlers/orgs.handler';
import { aiHandler } from './handlers/ai.handler';

export interface MockResponse {
  status: number;
  data: unknown;
}

type Handler = (config: InternalAxiosRequestConfig) => MockResponse | null;

// Auth is always served by the real backend. The mock layer is opt-in for
// non-auth modules during incremental migration.
const handlers: Handler[] = [usersHandler, orgsHandler, aiHandler];

const dispatch = (config: InternalAxiosRequestConfig): MockResponse => {
  for (const handler of handlers) {
    const result = handler(config);
    if (result) return result;
  }
  if (typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn(
      `[mock-client] no handler for ${config.method?.toUpperCase()} ${config.url} — returning empty 200`,
    );
  }
  return { status: 200, data: null };
};

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

/**
 * Drop-in axios adapter that short-circuits requests to in-memory handlers.
 * Wraps responses in the same `{ success, data, timestamp }` envelope the real
 * backend returns, so the existing response interceptor unwraps them transparently.
 */
export const mockAdapter: AxiosAdapter = (config) =>
  new Promise((resolve, reject) => {
    const settle = () => {
      const { status, data } = dispatch(config);
      const response: AxiosResponse = {
        data: status >= 200 && status < 300 ? wrap(data) : { success: false, data, error: 'Mock error' },
        status,
        statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
        headers: {},
        config,
        request: {},
      };
      // Ensure config.headers is an AxiosHeaders instance for downstream code paths
      if (!response.config.headers) {
        response.config.headers = new AxiosHeaders();
      }
      if (status >= 200 && status < 300) {
        resolve(response);
      } else {
        const err: any = new Error(`Request failed with status code ${status}`);
        err.config = config;
        err.response = response;
        err.isAxiosError = true;
        reject(err);
      }
    };
    // Slight async delay so callers see a promise tick (matches real network)
    setTimeout(settle, 0);
  });
