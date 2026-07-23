import { STANDARD_ROLES } from './standard-roles';
import { PERMISSION_CATALOG } from './permissions';
import { ROLE_HOME, ROLE_PRECEDENCE } from './roles';

/**
 * The two ways a STANDARD_ROLES entry can be quietly broken:
 *
 * 1. A permission key that isn't in PERMISSION_CATALOG — `OrganizationsService
 *    .create()` filters against the seeded `permissions` collection, so an
 *    unknown key is dropped rather than rejected. The role ships short a grant.
 * 2. A role with no route prefix — `roleFromUser()` returns null and
 *    `(app)/layout.tsx` redirects to `/api/auth/clear`, so the account can
 *    never log in. PLANNING_ENG and FINANCE_VIEWER shipped this way.
 */
describe('STANDARD_ROLES', () => {
  const catalogNames = new Set(PERMISSION_CATALOG.map((p) => p.name));

  it.each(STANDARD_ROLES.map((r) => [r.name, r] as const))(
    '%s grants only permissions that exist in PERMISSION_CATALOG',
    (_name, role) => {
      const unknown = role.permissions.filter((p) => !catalogNames.has(p));
      expect(unknown).toEqual([]);
    },
  );

  it.each(STANDARD_ROLES.map((r) => [r.name] as const))(
    '%s has a landing route, so the account can actually log in',
    (name) => {
      expect(ROLE_HOME[name]).toBeDefined();
    },
  );

  it.each(STANDARD_ROLES.map((r) => [r.name] as const))(
    '%s appears in ROLE_PRECEDENCE so it can resolve as a primary role',
    (name) => {
      expect(ROLE_PRECEDENCE).toContain(name);
    },
  );

  it('grants no duplicate keys within a role', () => {
    for (const role of STANDARD_ROLES) {
      expect(new Set(role.permissions).size).toBe(role.permissions.length);
    }
  });

  it('does not provision roles whose portal has not shipped', () => {
    const names = STANDARD_ROLES.map((r) => r.name);
    expect(names).not.toContain('SUPPLIER');
    expect(names).not.toContain('SUBCONTRACTOR');
  });

  it('does not provision platform staff roles into tenant orgs', () => {
    const names = STANDARD_ROLES.map((r) => r.name);
    expect(names).not.toContain('SUPER_ADMIN');
    expect(names).not.toContain('SUPPORT_AGENT');
  });
});
