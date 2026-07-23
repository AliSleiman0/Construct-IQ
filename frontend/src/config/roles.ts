/**
 * Role taxonomy. Single source of truth for:
 * - canonical role keys (must match the backend `Role.name` seed values)
 * - per-role URL prefix
 * - per-role landing route after login
 *
 * Backend `/auth/login` returns `user.roles: string[]` using these exact keys,
 * so the frontend never has to translate human-readable role names.
 */

export const ROLES = [
  'SUPER_ADMIN',
  'SUPPORT_AGENT',
  'ORG_ADMIN',
  'PM',
  'PROCUREMENT',
  'SURVEYOR',
  'PLANNING_ENG',
  'SITE_ENG',
  'FINANCE_VIEWER',
  'CLIENT',
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Most-privileged-first ordering. When a user has multiple roles, the first
 * match in this list is the "primary" role used for landing pages and
 * sidebar nav. Mirrors the backend ordering — keep them in lockstep.
 */
export const ROLE_PRECEDENCE: readonly Role[] = [
  'SUPER_ADMIN',
  'SUPPORT_AGENT',
  'ORG_ADMIN',
  'PM',
  'PROCUREMENT',
  'SURVEYOR',
  'PLANNING_ENG',
  'SITE_ENG',
  'FINANCE_VIEWER',
  'CLIENT',
];

export const ROLE_PREFIX: Record<Role, string> = {
  SUPER_ADMIN: '/super-admin',
  SUPPORT_AGENT: '/support-agent',
  ORG_ADMIN: '/admin',
  PM: '/pm',
  PROCUREMENT: '/procurement',
  SURVEYOR: '/surveyor',
  PLANNING_ENG: '/planning-eng',
  SITE_ENG: '/site-eng',
  FINANCE_VIEWER: '/finance',
  CLIENT: '/client',
};

export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: '/super-admin/dashboard',
  SUPPORT_AGENT: '/support-agent/dashboard',
  ORG_ADMIN: '/admin/dashboard',
  PM: '/pm/dashboard',
  PROCUREMENT: '/procurement/dashboard',
  SURVEYOR: '/surveyor/dashboard',
  PLANNING_ENG: '/planning-eng/dashboard',
  SITE_ENG: '/site-eng/dashboard',
  FINANCE_VIEWER: '/finance/dashboard',
  CLIENT: '/client/dashboard',
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  SUPPORT_AGENT: 'Support Agent',
  ORG_ADMIN: 'Org Admin',
  PM: 'Project Manager',
  PROCUREMENT: 'Procurement',
  SURVEYOR: 'Quantity Surveyor',
  PLANNING_ENG: 'Planning Engineer',
  SITE_ENG: 'Site Engineer',
  FINANCE_VIEWER: 'Finance Viewer',
  CLIENT: 'Client Viewer',
};

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);

/**
 * Pick the most-privileged role from a user's role list per ROLE_PRECEDENCE.
 * Returns null if the user has no recognized roles.
 */
export const roleFromUser = (roles: string[] | undefined | null): Role | null => {
  if (!roles?.length) return null;
  for (const candidate of ROLE_PRECEDENCE) {
    if (roles.includes(candidate)) return candidate;
  }
  return null;
};
