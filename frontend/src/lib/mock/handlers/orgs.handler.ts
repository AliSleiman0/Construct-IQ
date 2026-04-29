import type { InternalAxiosRequestConfig } from 'axios';
import { mockOrgs, findOrgById } from '@/mocks/orgs.mock';
import type { MockResponse } from '../mock-client';

const toListItem = (o: (typeof mockOrgs)[number]) => ({
  id: o.id,
  name: o.name,
  slug: o.slug,
  logoUrl: o.logoUrl ?? null,
  email: o.email,
  address: o.address,
  phone: o.phone,
  website: o.website,
  maxUsers: o.maxUsers ?? null,
  isActive: o.isActive,
  createdAt: o.createdAt,
  updatedAt: o.updatedAt,
  _count: { users: o.userCount, projects: o.projectCount },
});

export const orgsHandler = (config: InternalAxiosRequestConfig): MockResponse | null => {
  const url = config.url ?? '';
  const method = (config.method ?? 'get').toLowerCase();

  if (url === '/organizations' && method === 'get') {
    return { status: 200, data: mockOrgs.map(toListItem) };
  }

  const byId = /^\/organizations\/([^/]+)$/.exec(url);
  if (byId && method === 'get') {
    const org = findOrgById(byId[1]);
    if (!org) return { status: 404, data: null };
    return { status: 200, data: toListItem(org) };
  }

  const stats = /^\/organizations\/([^/]+)\/stats$/.exec(url);
  if (stats && method === 'get') {
    const org = findOrgById(stats[1]);
    if (!org) return { status: 404, data: null };
    return {
      status: 200,
      data: {
        totalUsers: org.userCount,
        totalProjects: org.projectCount,
        activeProjects: Math.max(0, org.projectCount - 1),
      },
    };
  }

  return null;
};
