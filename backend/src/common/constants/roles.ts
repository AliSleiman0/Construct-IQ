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
