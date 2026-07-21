import {
  buildNavigationTools,
  describeDestinations,
  resolveNavigationRoute,
  resolveNavigationScope,
} from './navigation-catalog';

/**
 * The navigation catalog is the per-user boundary for the AI assistant: it
 * decides which pages ever reach the model's tool enum. A leak here means the
 * assistant offers a Site Engineer the budget page — the exact failure this
 * whole feature exists to prevent.
 *
 * Permission sets below mirror STANDARD_ROLES in organizations.service.ts.
 */
const SITE_ENG_PERMS = [
  'read:projects',
  'read:users',
  'read:tasks',
  'update:tasks',
  'create:reports',
  'read:reports',
  'read:issues',
  'read:inspections',
  'read:rfis',
  'read:deliveries',
  'confirm:deliveries',
  'read:documents',
  'read:ai',
  'use:ai',
  'read:dashboard',
];

const PM_PERMS = [
  'read:users',
  'manage:projects',
  'manage:phases',
  'manage:tasks',
  'manage:reports',
  'manage:issues',
  'read:budget',
  'read:purchase_orders',
  'manage:documents',
  'read:dashboard',
  'use:ai',
  'manage:bids',
];

const SURVEYOR_PERMS = [
  'read:projects',
  'read:tasks',
  'read:reports',
  'manage:budget',
  'read:purchase_orders',
  'read:documents',
  'read:dashboard',
  'use:ai',
];

/** ChatCompletionTool is a union in the SDK; every tool we build is a function tool. */
const toolNames = (tools: ReturnType<typeof buildNavigationTools>) =>
  tools.map((t) => (t as { function: { name: string } }).function.name);

const sectionEnum = (tools: ReturnType<typeof buildNavigationTools>) => {
  const tool = tools.find(
    (t) => (t as { function: { name: string } }).function.name === 'navigate_to_section',
  ) as { function: { parameters: any } } | undefined;
  return tool?.function.parameters.properties.section.enum as string[];
};

const keysOf = (perms: string[], roles: string[]) =>
  resolveNavigationScope(roles, perms).destinations.map((d) => d.key);

describe('navigation catalog — per-user scoping', () => {
  describe('SITE_ENG', () => {
    const scope = resolveNavigationScope(['SITE_ENG'], SITE_ENG_PERMS);

    it('offers the site engineer their own sections', () => {
      expect(scope.destinations.map((d) => d.key)).toEqual(
        expect.arrayContaining(['tasks', 'daily-reports', 'issues', 'inspections', 'rfis']),
      );
    });

    it('does NOT offer budget — no read:budget', () => {
      expect(keysOf(SITE_ENG_PERMS, ['SITE_ENG'])).not.toContain('budget');
    });

    it('does NOT offer people even though the role has read:users — there is no site-eng route for it', () => {
      expect(keysOf(SITE_ENG_PERMS, ['SITE_ENG'])).not.toContain('people');
    });

    it('emits role-prefixed routes, not bare section paths', () => {
      const reports = scope.destinations.find((d) => d.key === 'daily-reports');
      expect(reports?.route).toBe('/site-eng/reports');
    });

    it('refuses to resolve an out-of-scope section even if the model asks for it', () => {
      expect(resolveNavigationRoute('navigate_to_section', { section: 'budget' }, scope)).toBeNull();
    });

    it('keeps budget out of the tool enum entirely', () => {
      const sections = sectionEnum(buildNavigationTools(scope));
      expect(sections).not.toContain('budget');
      expect(sections).toContain('daily-reports');
    });
  });

  describe('PM', () => {
    const scope = resolveNavigationScope(['PM'], PM_PERMS);

    it('resolves budget to the PM-prefixed route, not /budget', () => {
      const budget = scope.destinations.find((d) => d.key === 'budget');
      expect(budget?.route).toBe('/pm/budget');
    });

    it('grants budget via the manage:<resource> hierarchy where applicable', () => {
      // manage:reports satisfies read:reports
      expect(scope.destinations.map((d) => d.key)).toContain('daily-reports');
    });

    it('offers navigate_to_project because the PM can read projects', () => {
      expect(scope.canOpenProject).toBe(true);
      expect(toolNames(buildNavigationTools(scope))).toContain('navigate_to_project');
      expect(
        resolveNavigationRoute('navigate_to_project', { projectId: 'p1' }, scope),
      ).toEqual({ route: '/pm/projects/p1', label: 'that project' });
    });
  });

  describe('SURVEYOR', () => {
    const scope = resolveNavigationScope(['SURVEYOR'], SURVEYOR_PERMS);

    it('offers the surveyor cost sections at their own prefix', () => {
      const routes = Object.fromEntries(scope.destinations.map((d) => [d.key, d.route]));
      expect(routes['boq']).toBe('/surveyor/boq');
      expect(routes['budget']).toBe('/surveyor/budget');
    });

    it('does NOT offer daily reports — the surveyor has no reports route', () => {
      expect(keysOf(SURVEYOR_PERMS, ['SURVEYOR'])).not.toContain('daily-reports');
    });

    it('cannot be navigated to a specific project (no projects route)', () => {
      expect(scope.canOpenProject).toBe(false);
      expect(
        resolveNavigationRoute('navigate_to_project', { projectId: 'p1' }, scope),
      ).toBeNull();
    });
  });

  describe('ORG_ADMIN wildcard', () => {
    it('manage:company unlocks every destination its role has a route for', () => {
      const scope = resolveNavigationScope(['ORG_ADMIN'], ['manage:company']);
      expect(scope.destinations.map((d) => d.key)).toEqual(
        expect.arrayContaining(['projects', 'people', 'settings', 'daily-reports']),
      );
      expect(scope.fallbackRoute).toBe('/admin/dashboard');
    });
  });

  describe('degenerate cases', () => {
    it('an unrecognized role yields no destinations and a safe fallback', () => {
      const scope = resolveNavigationScope(['NOT_A_ROLE'], ['manage:all']);
      expect(scope.destinations).toEqual([]);
      expect(scope.fallbackRoute).toBe('/');
      expect(buildNavigationTools(scope)).toEqual([]);
      expect(describeDestinations(scope)).toBe('');
    });

    it('a role with a UI but no permissions still gets its dashboard', () => {
      const scope = resolveNavigationScope(['SITE_ENG'], []);
      expect(scope.destinations.map((d) => d.key)).toEqual(['dashboard']);
    });

    it('picks the most-privileged role when several are held', () => {
      const scope = resolveNavigationScope(['SITE_ENG', 'PM'], PM_PERMS);
      expect(scope.role).toBe('PM');
      expect(scope.fallbackRoute).toBe('/pm/dashboard');
    });

    it('rejects an unknown tool name', () => {
      const scope = resolveNavigationScope(['PM'], PM_PERMS);
      expect(resolveNavigationRoute('delete_everything', {}, scope)).toBeNull();
    });
  });
});
