import {
  hasWildcard,
  satisfiesAll,
  satisfiesPermission,
} from './permission-check.util';

/**
 * These semantics are shared by PermissionsGuard (route access) and the AI
 * scope resolvers (which capabilities/destinations a caller is offered). A
 * divergence here would let the assistant advertise something the API refuses,
 * or hide something the user legitimately has.
 */
describe('permission-check util', () => {
  describe('wildcards', () => {
    it('manage:all satisfies anything', () => {
      expect(satisfiesPermission(['manage:all'], 'read:budget')).toBe(true);
      expect(satisfiesPermission(['manage:all'], 'approve:purchase_orders')).toBe(true);
    });

    it('manage:company satisfies anything (ORG_ADMIN carries only this key)', () => {
      expect(satisfiesPermission(['manage:company'], 'read:reports')).toBe(true);
      expect(satisfiesPermission(['manage:company'], 'use:ai')).toBe(true);
    });

    it('hasWildcard only fires on the two wildcard keys', () => {
      expect(hasWildcard(['manage:all'])).toBe(true);
      expect(hasWildcard(['manage:company'])).toBe(true);
      expect(hasWildcard(['manage:projects'])).toBe(false);
      expect(hasWildcard([])).toBe(false);
    });
  });

  describe('exact + hierarchical matching', () => {
    it('matches an exact key', () => {
      expect(satisfiesPermission(['use:ai'], 'use:ai')).toBe(true);
    });

    it('manage:<resource> satisfies granular actions on that resource', () => {
      expect(satisfiesPermission(['manage:reports'], 'read:reports')).toBe(true);
      expect(satisfiesPermission(['manage:tasks'], 'assign:tasks')).toBe(true);
      expect(satisfiesPermission(['manage:deliveries'], 'confirm:deliveries')).toBe(true);
    });

    it('does NOT leak across resources', () => {
      expect(satisfiesPermission(['manage:reports'], 'read:budget')).toBe(false);
      expect(satisfiesPermission(['read:reports'], 'read:budget')).toBe(false);
    });

    it('a granular grant does not imply manage on the same resource', () => {
      expect(satisfiesPermission(['read:budget'], 'manage:budget')).toBe(false);
    });

    it('an empty grant list satisfies nothing', () => {
      expect(satisfiesPermission([], 'read:tasks')).toBe(false);
    });
  });

  describe('satisfiesAll', () => {
    it('requires every key', () => {
      const granted = ['read:reports', 'read:tasks'];
      expect(satisfiesAll(granted, ['read:reports', 'read:tasks'])).toBe(true);
      expect(satisfiesAll(granted, ['read:reports', 'read:budget'])).toBe(false);
    });

    it('an empty requirement list is always satisfied', () => {
      expect(satisfiesAll([], [])).toBe(true);
    });
  });
});
