/**
 * System role name constants.
 * These match the `name` field seeded in the `roles` table.
 * Use these constants instead of raw strings in guards, services, and tests.
 */
export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  PROJECT_MANAGER: 'Project Manager',
  SITE_ENGINEER: 'Site Engineer',
  PLANNING_ENGINEER: 'Planning Engineer',
  QUANTITY_SURVEYOR: 'Quantity Surveyor',
  PROCUREMENT_OFFICER: 'Procurement Officer',
  FINANCE_VIEWER: 'Finance / Management Viewer',
  CLIENT_VIEWER: 'Client Viewer',
  // Future roles — defined now so schema is ready
  SUPPLIER_USER: 'Supplier User',
  SUBCONTRACTOR_USER: 'Subcontractor User',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
