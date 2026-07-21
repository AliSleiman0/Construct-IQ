/**
 * Permission-satisfaction semantics — the single source of truth.
 *
 * Used by `PermissionsGuard` (route access) and by the AI scope resolvers
 * (which agents/destinations a caller may reach). Keeping both on this helper
 * is what stops the AI from offering a capability the API would then refuse.
 *
 * Rules, in order:
 *   1. `manage:all`     — Super Admin wildcard, satisfies everything.
 *   2. `manage:company` — Org Admin wildcard, satisfies everything within the
 *                         org (org scoping itself is enforced at service level).
 *   3. Exact match.
 *   4. Hierarchy: `manage:<resource>` satisfies any granular action on that
 *      resource (`read|create|update|delete|assign|approve|confirm|upload|use`).
 */

const GRANULAR_ACTION =
  /^(?:read|create|update|delete|assign|approve|confirm|upload|use):(.+)$/;

export const WILDCARD_PERMISSIONS = ['manage:all', 'manage:company'] as const;

/** True when the granted set carries an org-wide or platform-wide wildcard. */
export function hasWildcard(granted: string[]): boolean {
  return WILDCARD_PERMISSIONS.some((w) => granted.includes(w));
}

/** True when `granted` satisfies the single `required` permission key. */
export function satisfiesPermission(
  granted: string[],
  required: string,
): boolean {
  if (hasWildcard(granted)) return true;
  if (granted.includes(required)) return true;

  const match = required.match(GRANULAR_ACTION);
  return match ? granted.includes(`manage:${match[1]}`) : false;
}

/** True when `granted` satisfies every key in `required` (empty list = true). */
export function satisfiesAll(granted: string[], required: string[]): boolean {
  return required.every((key) => satisfiesPermission(granted, key));
}
