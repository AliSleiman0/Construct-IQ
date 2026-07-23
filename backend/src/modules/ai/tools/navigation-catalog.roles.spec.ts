import { NAV_DESTINATIONS, resolveNavigationScope } from './navigation-catalog';
import { STANDARD_ROLES } from '../../../common/constants/standard-roles';
import { ROLE_HOME } from '../../../common/constants/roles';
import { satisfiesAll } from '../../../common/util/permission-check.util';

/**
 * Coherence between the roles we provision and the pages we route them to.
 *
 * The navigation catalog says "SITE_ENG can reach /site-eng/reports"; the role
 * definition says which permissions a Site Engineer actually gets. When those
 * disagree, one of two bad things happens:
 *
 *   - route but no permission → the page is in their sidebar, the AI stays
 *     silent about it, and the API 403s if they click it. (This is exactly how
 *     Procurement lost Material Requests: a route entry with no
 *     `read:material_requests` grant in STANDARD_ROLES.)
 *   - permission but no route → harmless, but usually means a missing page.
 *
 * STANDARD_ROLES is the source used for every org created through the API, so
 * it — not scripts/seed.ts — is what these assertions must hold against.
 */
const permissionsFor = (roleName: string): string[] => {
  const role = STANDARD_ROLES.find((r) => r.name === roleName);
  if (!role) throw new Error(`STANDARD_ROLES has no role named ${roleName}`);
  return role.permissions;
};

/**
 * Roles the assistant is enabled for and that have a UI of their own.
 * PLANNING_ENG and FINANCE_VIEWER joined this list once their route prefixes
 * shipped — before that they were provisioned but unusable, because
 * `roleFromUser()` returned null and (app)/layout.tsx logged them straight out.
 */
const AI_ENABLED_ROLES = [
  'PM',
  'PROCUREMENT',
  'SURVEYOR',
  'SITE_ENG',
  'PLANNING_ENG',
  'FINANCE_VIEWER',
];

describe('navigation catalog ↔ STANDARD_ROLES coherence', () => {
  it.each(AI_ENABLED_ROLES)(
    '%s can reach every catalog destination that lists a route for it',
    (roleName) => {
      const permissions = permissionsFor(roleName);

      const unreachable = NAV_DESTINATIONS.filter(
        (d) => d.routes[roleName] && !satisfiesAll(permissions, d.requires),
      ).map((d) => `${d.label} (${d.routes[roleName]}) needs ${d.requires.join(', ')}`);

      expect(unreachable).toEqual([]);
    },
  );

  it.each(AI_ENABLED_ROLES)('%s carries use:ai', (roleName) => {
    expect(permissionsFor(roleName)).toContain('use:ai');
  });

  it.each(['CLIENT'])(
    '%s does NOT carry use:ai (external account)',
    (roleName) => {
      expect(permissionsFor(roleName)).not.toContain('use:ai');
    },
  );

  /**
   * The inverse of the "route but no permission" failure: a role we provision
   * but never route anywhere. That role's users cannot log in at all, because
   * `roleFromUser()` returns null and (app)/layout.tsx redirects them to
   * /api/auth/clear. PLANNING_ENG and FINANCE_VIEWER shipped in that state.
   */
  it.each(STANDARD_ROLES.map((r) => [r.name] as const))(
    '%s has a landing route, so the account can log in at all',
    (roleName) => {
      expect(ROLE_HOME[roleName]).toBeDefined();
    },
  );

  it.each(AI_ENABLED_ROLES)(
    '%s resolves at least one AI destination',
    (roleName) => {
      const scope = resolveNavigationScope([roleName], permissionsFor(roleName));
      expect(scope.destinations.length).toBeGreaterThan(0);
    },
  );

  it('ORG_ADMIN reaches everything through the manage:company wildcard', () => {
    const scope = resolveNavigationScope(['ORG_ADMIN'], permissionsFor('ORG_ADMIN'));
    const adminRoutes = NAV_DESTINATIONS.filter((d) => d.routes['ORG_ADMIN']);
    expect(scope.destinations).toHaveLength(adminRoutes.length);
  });

  it('every AI-enabled role gets at least one destination beyond its dashboard', () => {
    for (const roleName of AI_ENABLED_ROLES) {
      const scope = resolveNavigationScope([roleName], permissionsFor(roleName));
      expect(scope.destinations.length).toBeGreaterThan(1);
    }
  });
});
