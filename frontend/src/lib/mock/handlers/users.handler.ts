import type { InternalAxiosRequestConfig } from 'axios';
import { mockDemoUsers, findDemoUserById } from '@/mocks/users.mock';
import type { MockResponse } from '../mock-client';

export const usersHandler = (config: InternalAxiosRequestConfig): MockResponse | null => {
  const url = config.url ?? '';
  const method = (config.method ?? 'get').toLowerCase();

  if (url === '/users' && method === 'get') {
    return { status: 200, data: mockDemoUsers };
  }

  const byId = /^\/users\/([^/]+)$/.exec(url);
  if (byId && method === 'get') {
    const user = findDemoUserById(byId[1]);
    if (!user) return { status: 404, data: null };
    return { status: 200, data: user };
  }

  if (url === '/users/roles' && method === 'get') {
    const roleNames = Array.from(new Set(mockDemoUsers.flatMap((u) => u.roles)));
    return {
      status: 200,
      data: roleNames.map((name) => ({ id: `role-${name}`, name, description: null })),
    };
  }

  return null;
};
