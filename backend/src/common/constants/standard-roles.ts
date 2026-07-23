/**
 * The roles provisioned for every new organization, with their permission sets.
 *
 * Consumed by `OrganizationsService.create()` (which filters each list against
 * the names present in the `permissions` collection), by `scripts/seed.ts`, and
 * by `scripts/sync-role-permissions.ts`. It lives here rather than inside the
 * service so scripts can import it without dragging in the Nest DI graph.
 *
 * `name` MUST be the canonical role CODE — it must match
 * `common/constants/roles.ts` and `frontend/src/config/roles.ts`, because login
 * returns `roles: Role.name[]` and the frontend resolves the landing route and
 * sidebar from those codes. Human-readable labels live in `description` (and in
 * the frontend's ROLE_LABELS).
 *
 * Two invariants keep this list honest:
 *
 * 1. **Every permission here must exist in `PERMISSION_CATALOG`.** Org creation
 *    silently drops unknown keys, so a typo becomes a missing grant rather than
 *    an error. `standard-roles.spec.ts` enforces this.
 * 2. **Every role here must have a route prefix in `frontend/src/config/roles.ts`.**
 *    A role with no prefix makes `roleFromUser()` return null, and
 *    `(app)/layout.tsx` then bounces the user to `/api/auth/clear` — i.e. the
 *    account is unusable. This is why SUPPLIER/SUBCONTRACTOR are absent: they
 *    are defined in `roles.ts` for schema readiness but must not be
 *    provisioned as assignable until their portal ships.
 *
 * SUPER_ADMIN and SUPPORT_AGENT are deliberately absent — they are ConstructIQ
 * platform staff, not tenant staff, and are seeded into the platform org only
 * (see `scripts/seed.ts` PLATFORM_ROLES).
 *
 * `use:ai` goes to every internal staff role; the assistant then scopes itself
 * to whatever else that role can read (see `modules/ai/capabilities`).
 * ORG_ADMIN needs no explicit grant — `manage:company` is a wildcard. External
 * roles (CLIENT) deliberately get no assistant.
 */
export interface StandardRole {
  name: string;
  description: string;
  permissions: string[];
}

export const STANDARD_ROLES: StandardRole[] = [
  {
    name: 'ORG_ADMIN',
    description: 'Full control within own organization',
    permissions: ['manage:company'],
  },
  {
    name: 'PM',
    description: 'Manages assigned projects, team, tasks, and approves POs',
    permissions: [
      'read:organizations',
      'read:users',
      'read:roles',
      'manage:projects',
      'assign:project_members',
      'manage:phases',
      'manage:milestones',
      'manage:tasks',
      'assign:tasks',
      'manage:reports',
      'manage:issues',
      'assign:issues',
      'manage:inspections',
      'manage:rfis',
      'read:budget',
      'update:projects',
      'read:suppliers',
      'read:purchase_orders',
      'approve:purchase_orders',
      'reject:purchase_orders',
      'read:material_requests',
      'create:material_requests',
      'read:deliveries',
      'manage:documents',
      'read:dashboard',
      'read:ai',
      'use:ai',
      'manage:bids',
    ],
  },
  {
    name: 'SITE_ENG',
    description: 'Submits daily reports, creates issues, updates assigned tasks',
    permissions: [
      'read:projects',
      'read:users',
      'read:tasks',
      'update:tasks',
      'create:reports',
      'read:reports',
      'update:reports',
      'create:issues',
      'read:issues',
      'update:issues',
      'create:inspections',
      'read:inspections',
      'update:inspections',
      'create:rfis',
      'read:rfis',
      'update:rfis',
      'read:phases',
      'read:milestones',
      'read:deliveries',
      'confirm:deliveries',
      'read:documents',
      'upload:documents',
      'read:ai',
      'use:ai',
      'read:dashboard',
    ],
  },
  {
    name: 'PLANNING_ENG',
    description: 'Manages phases, milestones, and project schedule',
    permissions: [
      'read:projects',
      'read:users',
      'manage:phases',
      'manage:milestones',
      'manage:tasks',
      'assign:tasks',
      'read:reports',
      'read:issues',
      'read:budget',
      'read:documents',
      'read:dashboard',
      'read:ai',
      'use:ai',
    ],
  },
  {
    name: 'SURVEYOR',
    description: 'Owns budget management and cost tracking',
    permissions: [
      'read:projects',
      'read:users',
      'read:tasks',
      'read:phases',
      'read:milestones',
      'read:reports',
      'read:issues',
      'manage:budget',
      'read:purchase_orders',
      'read:deliveries',
      'read:suppliers',
      'read:documents',
      'read:dashboard',
      'read:ai',
      'use:ai',
    ],
  },
  {
    name: 'PROCUREMENT',
    description: 'Manages suppliers, purchase orders, and deliveries',
    permissions: [
      'read:projects',
      'read:users',
      'read:tasks',
      'read:phases',
      'read:milestones',
      'read:issues',
      'read:budget',
      'manage:suppliers',
      'manage:purchase_orders',
      'manage:material_requests',
      'manage:deliveries',
      'update:deliveries',
      'read:documents',
      'upload:documents',
      'read:dashboard',
      'read:ai',
      'use:ai',
      'manage:bids',
    ],
  },
  {
    name: 'FINANCE_VIEWER',
    description: 'Read-only visibility across projects, budget, and procurement',
    permissions: [
      'read:projects',
      'read:tasks',
      'read:phases',
      'read:milestones',
      'read:reports',
      'read:issues',
      'read:budget',
      'read:suppliers',
      'read:purchase_orders',
      'read:deliveries',
      'read:documents',
      'read:dashboard',
      'read:ai',
      'use:ai',
    ],
  },
  {
    name: 'CLIENT',
    description:
      'External client — limited read access to assigned project overview',
    permissions: [
      'read:projects',
      'read:milestones',
      'read:issues',
      'read:reports',
      'read:documents',
      'read:dashboard',
      'read:tickets',
      'create:tickets',
    ],
  },
];
