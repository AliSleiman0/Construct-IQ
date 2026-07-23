import OpenAI from 'openai';
import { PERMISSIONS } from '../../../common/constants/permissions';
import { ROLES, ROLE_HOME, primaryRole } from '../../../common/constants/roles';
import { satisfiesAll } from '../../../common/util/permission-check.util';

/**
 * AI navigation catalog — the destinations the assistant is allowed to offer.
 *
 * Every app page lives under its role's URL prefix (`/pm/budget`,
 * `/site-eng/reports`, …) and frontend/src/app/(app)/layout.tsx bounces anyone
 * who lands outside their own prefix. So a destination is only real for a
 * caller when BOTH hold:
 *   1. their primary role has a route for it, and
 *   2. their permissions satisfy `requires`.
 *
 * That double filter is what scopes the assistant per user: a Site Engineer
 * has no `read:budget`, so `budget` never enters the tool enum, never reaches
 * the model, and can never be returned as an action.
 *
 * KEEP IN LOCKSTEP with frontend/src/config/sidebar-nav.ts — that file is the
 * UI source of truth; this one is its permission-annotated backend mirror.
 */
export interface NavDestination {
  /** Enum value handed to the model. Kebab-case, human-guessable. */
  key: string;
  /** Human label used in replies and refusal messages. */
  label: string;
  /** ALL must be satisfied by the caller's permissions. */
  requires: string[];
  /** Per-role route. A role missing here cannot reach the destination. */
  routes: Partial<Record<string, string>>;
}

const {
  ADMIN,
  PROJECT_MANAGER,
  PROCUREMENT_OFFICER,
  QUANTITY_SURVEYOR,
  SITE_ENGINEER,
  PLANNING_ENGINEER,
  FINANCE_VIEWER,
} = ROLES;

export const NAV_DESTINATIONS: NavDestination[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    requires: [],
    routes: {
      [ADMIN]: '/admin/dashboard',
      [PROJECT_MANAGER]: '/pm/dashboard',
      [PROCUREMENT_OFFICER]: '/procurement/dashboard',
      [QUANTITY_SURVEYOR]: '/surveyor/dashboard',
      [SITE_ENGINEER]: '/site-eng/dashboard',
      [PLANNING_ENGINEER]: '/planning-eng/dashboard',
      [FINANCE_VIEWER]: '/finance/dashboard',
    },
  },
  {
    key: 'projects',
    label: 'Projects',
    requires: [PERMISSIONS.PROJECTS.READ],
    routes: {
      [ADMIN]: '/admin/projects',
      [PROJECT_MANAGER]: '/pm/projects',
    },
  },
  {
    key: 'people',
    label: 'People',
    requires: [PERMISSIONS.USERS.READ],
    routes: {
      [ADMIN]: '/admin/people',
    },
  },
  {
    key: 'schedule',
    label: 'Schedule',
    requires: [PERMISSIONS.PHASES.READ],
    routes: {
      [PROJECT_MANAGER]: '/pm/schedule',
      [PLANNING_ENGINEER]: '/planning-eng/schedule',
      [SITE_ENGINEER]: '/site-eng/schedule',
    },
  },
  {
    key: 'tasks',
    label: 'Tasks',
    requires: [PERMISSIONS.TASKS.READ],
    routes: {
      [ADMIN]: '/admin/tasks',
      [PROJECT_MANAGER]: '/pm/tasks',
      [SITE_ENGINEER]: '/site-eng/tasks',
      [PLANNING_ENGINEER]: '/planning-eng/tasks',
    },
  },
  {
    key: 'daily-reports',
    label: 'Daily Reports',
    requires: [PERMISSIONS.REPORTS.READ],
    routes: {
      // Org Admin's /admin/reports is now the Analytics roll-up; the raw daily
      // report list lives at /admin/daily-reports.
      [ADMIN]: '/admin/daily-reports',
      [PROJECT_MANAGER]: '/pm/reports',
      [SITE_ENGINEER]: '/site-eng/reports',
      [PLANNING_ENGINEER]: '/planning-eng/reports',
      [QUANTITY_SURVEYOR]: '/surveyor/reports',
      [FINANCE_VIEWER]: '/finance/reports',
    },
  },
  {
    key: 'analytics',
    label: 'Analytics',
    requires: [PERMISSIONS.DASHBOARD.READ],
    routes: {
      [ADMIN]: '/admin/reports',
    },
  },
  {
    key: 'issues',
    label: 'Issues',
    requires: [PERMISSIONS.ISSUES.READ],
    routes: {
      [ADMIN]: '/admin/issues',
      [PROJECT_MANAGER]: '/pm/issues',
      [SITE_ENGINEER]: '/site-eng/issues',
      [PLANNING_ENGINEER]: '/planning-eng/issues',
      [QUANTITY_SURVEYOR]: '/surveyor/issues',
    },
  },
  {
    key: 'inspections',
    label: 'Inspections',
    requires: [PERMISSIONS.INSPECTIONS.READ],
    routes: {
      [PROJECT_MANAGER]: '/pm/inspections',
      [SITE_ENGINEER]: '/site-eng/inspections',
    },
  },
  {
    key: 'rfis',
    label: 'RFIs',
    requires: [PERMISSIONS.RFIS.READ],
    routes: {
      [PROJECT_MANAGER]: '/pm/rfis',
      [SITE_ENGINEER]: '/site-eng/rfis',
    },
  },
  {
    key: 'budget',
    label: 'Budget',
    requires: [PERMISSIONS.BUDGET.READ],
    routes: {
      [ADMIN]: '/admin/budget',
      [PROJECT_MANAGER]: '/pm/budget',
      [QUANTITY_SURVEYOR]: '/surveyor/budget',
      [PLANNING_ENGINEER]: '/planning-eng/budget',
      [FINANCE_VIEWER]: '/finance/budget',
    },
  },
  {
    key: 'boq',
    label: 'BOQ',
    requires: [PERMISSIONS.BUDGET.READ],
    routes: {
      [QUANTITY_SURVEYOR]: '/surveyor/boq',
    },
  },
  {
    key: 'variations',
    label: 'Variations',
    requires: [PERMISSIONS.BUDGET.READ],
    routes: {
      [QUANTITY_SURVEYOR]: '/surveyor/variations',
    },
  },
  {
    key: 'valuations',
    label: 'Valuations',
    requires: [PERMISSIONS.BUDGET.READ],
    routes: {
      [QUANTITY_SURVEYOR]: '/surveyor/valuations',
    },
  },
  {
    key: 'procurement',
    label: 'Procurement',
    requires: [PERMISSIONS.PURCHASE_ORDERS.READ],
    routes: {
      [ADMIN]: '/admin/procurement',
      [PROJECT_MANAGER]: '/pm/procurement',
    },
  },
  {
    key: 'purchase-orders',
    label: 'Purchase Orders',
    requires: [PERMISSIONS.PURCHASE_ORDERS.READ],
    routes: {
      [PROCUREMENT_OFFICER]: '/procurement/orders',
      [QUANTITY_SURVEYOR]: '/surveyor/orders',
      [FINANCE_VIEWER]: '/finance/orders',
    },
  },
  {
    key: 'material-requests',
    label: 'Material Requests',
    requires: [PERMISSIONS.MATERIAL_REQUESTS.READ],
    routes: {
      [PROCUREMENT_OFFICER]: '/procurement/material-requests',
    },
  },
  {
    key: 'suppliers',
    label: 'Suppliers',
    requires: [PERMISSIONS.SUPPLIERS.READ],
    routes: {
      [PROCUREMENT_OFFICER]: '/procurement/suppliers',
      [FINANCE_VIEWER]: '/finance/suppliers',
    },
  },
  {
    key: 'deliveries',
    label: 'Deliveries',
    requires: [PERMISSIONS.DELIVERIES.READ],
    routes: {
      [PROCUREMENT_OFFICER]: '/procurement/deliveries',
      [SITE_ENGINEER]: '/site-eng/deliveries',
    },
  },
  {
    key: 'bids',
    label: 'Bids',
    requires: [PERMISSIONS.BIDS.READ],
    routes: {
      [PROJECT_MANAGER]: '/pm/bids',
      [PROCUREMENT_OFFICER]: '/procurement/bids',
    },
  },
  {
    key: 'documents',
    label: 'Documents',
    requires: [PERMISSIONS.DOCUMENTS.READ],
    routes: {
      [ADMIN]: '/admin/documents',
      [PROJECT_MANAGER]: '/pm/documents',
      [PROCUREMENT_OFFICER]: '/procurement/documents',
      [SITE_ENGINEER]: '/site-eng/documents',
      [PLANNING_ENGINEER]: '/planning-eng/documents',
      [FINANCE_VIEWER]: '/finance/documents',
    },
  },
  {
    key: 'roles',
    label: 'Roles',
    requires: [PERMISSIONS.ROLES.READ],
    routes: {
      [ADMIN]: '/admin/roles',
    },
  },
  {
    key: 'audit-log',
    label: 'Audit Log',
    requires: [PERMISSIONS.AUDIT_LOGS.READ],
    routes: {
      [ADMIN]: '/admin/audit-log',
    },
  },
  {
    key: 'subscription',
    label: 'Subscription',
    requires: [PERMISSIONS.SETTINGS.READ],
    routes: {
      [ADMIN]: '/admin/subscription',
    },
  },
  {
    key: 'settings',
    label: 'Settings',
    requires: [PERMISSIONS.SETTINGS.READ],
    routes: {
      [ADMIN]: '/admin/settings',
    },
  },
];

/** A destination already resolved to a concrete route for one caller. */
export interface ResolvedDestination {
  key: string;
  label: string;
  route: string;
}

export interface NavigationScope {
  /** The caller's primary role, or null when none is recognized. */
  role: string | null;
  /** Where to land the caller when nothing better resolves. */
  fallbackRoute: string;
  destinations: ResolvedDestination[];
  /** Whether the caller may be navigated to a specific project by id. */
  canOpenProject: boolean;
}

/**
 * Resolve the navigation scope for one caller. This is the whole per-user
 * filter — everything downstream reads from the returned list only.
 */
export function resolveNavigationScope(
  roles: string[],
  permissions: string[],
): NavigationScope {
  const role = primaryRole(roles);
  const fallbackRoute = (role && ROLE_HOME[role]) ?? '/';

  const destinations: ResolvedDestination[] = role
    ? NAV_DESTINATIONS.filter(
        (d) => d.routes[role] && satisfiesAll(permissions, d.requires),
      ).map((d) => ({ key: d.key, label: d.label, route: d.routes[role] as string }))
    : [];

  return {
    role,
    fallbackRoute,
    destinations,
    canOpenProject:
      destinations.some((d) => d.key === 'projects') &&
      satisfiesAll(permissions, [PERMISSIONS.PROJECTS.READ]),
  };
}

/**
 * Build the OpenAI tool definitions for one caller. The `section` enum carries
 * only that caller's destinations, so the model is structurally unable to pick
 * a page they cannot reach.
 *
 * Returns an empty array when the caller has no destinations — callers should
 * skip the model round-trip entirely in that case.
 */
export function buildNavigationTools(
  scope: NavigationScope,
): OpenAI.ChatCompletionTool[] {
  if (scope.destinations.length === 0) return [];

  const tools: OpenAI.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'navigate_to_section',
        description:
          'Navigate the user to a section of the application. Only the sections listed in the enum are available to this user.',
        parameters: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              enum: scope.destinations.map((d) => d.key),
              description: scope.destinations
                .map((d) => `${d.key} (${d.label})`)
                .join(', '),
            },
          },
          required: ['section'],
        },
      },
    },
  ];

  if (scope.canOpenProject) {
    tools.push({
      type: 'function',
      function: {
        name: 'navigate_to_project',
        description: 'Navigate the user to a specific project by its ID.',
        parameters: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'The ID of the project to navigate to',
            },
          },
          required: ['projectId'],
        },
      },
    });
  }

  return tools;
}

/**
 * Map a model tool call to a real route, re-validating against the caller's
 * own scope. A hallucinated or out-of-scope section resolves to null so the
 * caller can refuse rather than navigate somewhere the user would be bounced
 * off anyway.
 */
export function resolveNavigationRoute(
  toolName: string,
  toolInput: Record<string, string>,
  scope: NavigationScope,
): { route: string; label: string } | null {
  if (toolName === 'navigate_to_section') {
    const match = scope.destinations.find((d) => d.key === toolInput.section);
    return match ? { route: match.route, label: match.label } : null;
  }

  if (toolName === 'navigate_to_project') {
    if (!scope.canOpenProject || !toolInput.projectId) return null;
    const projects = scope.destinations.find((d) => d.key === 'projects');
    if (!projects) return null;
    return {
      route: `${projects.route}/${toolInput.projectId}`,
      label: 'that project',
    };
  }

  return null;
}

/** Comma-joined destination labels — used in replies and refusals. */
export function describeDestinations(scope: NavigationScope): string {
  return scope.destinations.map((d) => d.label).join(', ');
}
