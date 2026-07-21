/**
 * System role name constants — canonical role CODES.
 * These match the `name` field seeded in the `roles` table (see
 * backend/scripts/seed.ts and OrganizationsService.STANDARD_ROLES) and the
 * frontend taxonomy (frontend/src/config/roles.ts). Login returns these codes
 * in `user.roles`; human-readable labels live in the frontend ROLE_LABELS.
 * Use these constants instead of raw strings in guards, services, and tests.
 */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ORG_ADMIN',
  PROJECT_MANAGER: 'PM',
  SITE_ENGINEER: 'SITE_ENG',
  PLANNING_ENGINEER: 'PLANNING_ENG',
  QUANTITY_SURVEYOR: 'SURVEYOR',
  PROCUREMENT_OFFICER: 'PROCUREMENT',
  FINANCE_VIEWER: 'FINANCE_VIEWER',
  CLIENT_VIEWER: 'CLIENT',
  // Future roles — defined now so schema is ready
  SUPPLIER_USER: 'SUPPLIER',
  SUBCONTRACTOR_USER: 'SUBCONTRACTOR',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/**
 * Most-privileged-first ordering. A user may hold several roles; the first
 * match here is their "primary" role — the one whose URL prefix and landing
 * page apply. Mirrors `ROLE_PRECEDENCE` in frontend/src/config/roles.ts —
 * keep them in lockstep.
 */
export const ROLE_PRECEDENCE: readonly string[] = [
  ROLES.SUPER_ADMIN,
  'SUPPORT_AGENT',
  ROLES.ADMIN,
  ROLES.PROJECT_MANAGER,
  ROLES.PROCUREMENT_OFFICER,
  ROLES.QUANTITY_SURVEYOR,
  ROLES.PLANNING_ENGINEER,
  ROLES.SITE_ENGINEER,
  ROLES.FINANCE_VIEWER,
  ROLES.CLIENT_VIEWER,
];

/**
 * Per-role landing route. Every authenticated page lives under the role's own
 * prefix and frontend/src/app/(app)/layout.tsx redirects anyone who lands
 * outside theirs — so any route the backend hands to the client (AI
 * navigation) must be built from this taxonomy, never from a bare `/section`.
 * Mirrors `ROLE_HOME` in frontend/src/config/roles.ts.
 *
 * Roles absent from this map have no UI of their own yet (PLANNING_ENG,
 * FINANCE_VIEWER, SUPPLIER, SUBCONTRACTOR).
 */
export const ROLE_HOME: Partial<Record<string, string>> = {
  [ROLES.SUPER_ADMIN]: '/super-admin/dashboard',
  SUPPORT_AGENT: '/support-agent/dashboard',
  [ROLES.ADMIN]: '/admin/dashboard',
  [ROLES.PROJECT_MANAGER]: '/pm/dashboard',
  [ROLES.PROCUREMENT_OFFICER]: '/procurement/dashboard',
  [ROLES.QUANTITY_SURVEYOR]: '/surveyor/dashboard',
  [ROLES.SITE_ENGINEER]: '/site-eng/dashboard',
  [ROLES.CLIENT_VIEWER]: '/client/dashboard',
};

/**
 * Pick the most-privileged role from a user's role list per ROLE_PRECEDENCE.
 * Returns null when none are recognized.
 */
export function primaryRole(roles: string[] | undefined | null): string | null {
  if (!roles?.length) return null;
  return ROLE_PRECEDENCE.find((candidate) => roles.includes(candidate)) ?? null;
}
