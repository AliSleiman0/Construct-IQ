import type { Role } from '@/config/roles';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  shortName?: string | null;
  industry?: string | null;
  size?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  maxUsers?: number | null;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLoginAt?: string | null;
  isSuperAdmin?: boolean;
  organization: Organization;
  roles: string[];
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  /** Submit credentials to the backend; on success sets user and returns the post-login route. */
  loginWithEmail: (credentials: LoginCredentials) => Promise<string>;
  /** Synchronously hydrate the store from a user resolved by the Server Component layout. */
  hydrateFromUser: (user: AuthUser) => void;
  /** Re-fetch /auth/me and update the store. Used after mutations that change user/org. */
  refreshMe: () => Promise<void>;
  /** Clear local auth state. The backend cookies are cleared by /auth/logout via useLogout. */
  logout: () => void;
}
