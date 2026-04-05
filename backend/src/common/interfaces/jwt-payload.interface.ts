export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}
