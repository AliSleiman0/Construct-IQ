import type { AuthUser } from '@/types/auth.types';
import { mockOrgs, findOrgById } from './orgs.mock';

/**
 * Demo users — one per role. The `roles[0]` value is the canonical role key
 * (matches the Role enum in `config/roles.ts`).
 *
 * Super Admin and Support Agent are system-level and not bound to a tenant.
 * For frontend convenience we still attach them to the first mock org so
 * `user.organization` is always defined.
 */
export interface DemoUser extends AuthUser {
  roleLabel: string;
  orgName: string;
}

const orgA = mockOrgs.find((o) => o.slug === 'company-a')!;

export const mockDemoUsers: DemoUser[] = [
  {
    id: 'user-super-admin',
    email: 'anjana@constructiq.com',
    firstName: 'Anjana',
    lastName: 'Patel',
    phone: '+1-555-1001',
    avatarUrl: null,
    status: 'ACTIVE',
    lastLoginAt: '2026-04-27T10:30:00.000Z',
    isSuperAdmin: true,
    organization: orgA,
    roles: ['SUPER_ADMIN'],
    permissions: ['*'],
    roleLabel: 'Super Admin',
    orgName: 'System',
  },
  {
    id: 'user-support-agent',
    email: 'sam@constructiq.com',
    firstName: 'Sam',
    lastName: 'Chen',
    phone: '+1-555-1002',
    avatarUrl: null,
    status: 'ACTIVE',
    lastLoginAt: '2026-04-27T11:15:00.000Z',
    organization: orgA,
    roles: ['SUPPORT_AGENT'],
    permissions: [],
    roleLabel: 'Support Agent',
    orgName: 'ConstructIQ Staff',
  },
  {
    id: 'user-org-admin',
    email: 'olivia@companya.com',
    firstName: 'Olivia',
    lastName: 'Romero',
    phone: '+1-555-2001',
    avatarUrl: null,
    status: 'ACTIVE',
    lastLoginAt: '2026-04-27T09:00:00.000Z',
    organization: orgA,
    roles: ['ORG_ADMIN'],
    permissions: [],
    roleLabel: 'Org Admin',
    orgName: 'Company A',
  },
  {
    id: 'user-pm',
    email: 'pete@companya.com',
    firstName: 'Pete',
    lastName: 'Williams',
    phone: '+1-555-2002',
    avatarUrl: null,
    status: 'ACTIVE',
    lastLoginAt: '2026-04-27T08:45:00.000Z',
    organization: orgA,
    roles: ['PM'],
    permissions: [],
    roleLabel: 'Project Manager',
    orgName: 'Company A — Tower Heights',
  },
  {
    id: 'user-procurement',
    email: 'priya@companya.com',
    firstName: 'Priya',
    lastName: 'Singh',
    phone: '+1-555-2003',
    avatarUrl: null,
    status: 'ACTIVE',
    lastLoginAt: '2026-04-27T08:30:00.000Z',
    organization: orgA,
    roles: ['PROCUREMENT'],
    permissions: [],
    roleLabel: 'Procurement',
    orgName: 'Company A',
  },
  {
    id: 'user-surveyor',
    email: 'sara@companya.com',
    firstName: 'Sara',
    lastName: 'Khalil',
    phone: '+1-555-2004',
    avatarUrl: null,
    status: 'ACTIVE',
    lastLoginAt: '2026-04-27T08:20:00.000Z',
    organization: orgA,
    roles: ['SURVEYOR'],
    permissions: [],
    roleLabel: 'Quantity Surveyor',
    orgName: 'Company A',
  },
  {
    id: 'user-site-eng',
    email: 'sebastian@companya.com',
    firstName: 'Sebastian',
    lastName: 'Diaz',
    phone: '+1-555-2005',
    avatarUrl: null,
    status: 'ACTIVE',
    lastLoginAt: '2026-04-27T07:00:00.000Z',
    organization: orgA,
    roles: ['SITE_ENG'],
    permissions: [],
    roleLabel: 'Site Engineer',
    orgName: 'Company A',
  },
  {
    id: 'user-client',
    email: 'carlos@gmail.com',
    firstName: 'Carlos',
    lastName: 'Rivera',
    phone: '+1-555-3001',
    avatarUrl: null,
    status: 'ACTIVE',
    lastLoginAt: '2026-04-26T19:00:00.000Z',
    organization: orgA,
    roles: ['CLIENT'],
    permissions: [],
    roleLabel: 'Client Viewer',
    orgName: 'Company A — Tower Heights, Unit 12B',
  },
];

export const findDemoUserById = (id: string): DemoUser | undefined =>
  mockDemoUsers.find((u) => u.id === id);

export const findDemoUserByEmail = (email: string): DemoUser | undefined =>
  mockDemoUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());

// re-export for convenience
export { findOrgById };
