export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  isSuperAdmin: boolean;
  /**
   * Resolved permission keys for the caller. NOT part of the signed token —
   * populated per-request by `PermissionsGuard` so controllers can make
   * scoping decisions. Undefined on routes that skip the guard.
   */
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}
