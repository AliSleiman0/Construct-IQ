import { create } from 'zustand';
import type { AuthState, AuthUser, LoginCredentials } from '@/types/auth.types';
import { ROLE_HOME, roleFromUser } from '@/config/roles';
import { authApi } from '@/lib/api/auth.api';

const resolveHome = (user: AuthUser): string => {
  const role = roleFromUser(user.roles);
  return role ? ROLE_HOME[role] : '/login';
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,

  setUser: (user: AuthUser | null) =>
    set({
      user,
      role: roleFromUser(user?.roles),
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  clearAuth: () =>
    set({ user: null, role: null, isAuthenticated: false, isLoading: false }),

  hasPermission: (permission: string) => {
    const { user } = get();
    const perms = user?.permissions ?? [];
    if (perms.includes('*') || perms.includes('manage:all') || perms.includes('manage:company')) {
      return true;
    }
    return perms.includes(permission);
  },

  hasRole: (role: string) => {
    const { user } = get();
    return user?.roles?.includes(role) ?? false;
  },

  loginWithEmail: async (credentials: LoginCredentials): Promise<string> => {
    set({ isLoading: true });
    try {
      const { user } = await authApi.login(credentials);
      set({
        user,
        role: roleFromUser(user.roles),
        isAuthenticated: true,
        isLoading: false,
      });
      return resolveHome(user);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  hydrateFromUser: (user: AuthUser) =>
    set({
      user,
      role: roleFromUser(user.roles),
      isAuthenticated: true,
      isLoading: false,
    }),

  refreshMe: async () => {
    try {
      const user = await authApi.getMe();
      set({
        user,
        role: roleFromUser(user.roles),
        isAuthenticated: true,
      });
    } catch (err) {
      console.error('refreshMe failed', err);
    }
  },

  logout: () =>
    set({ user: null, role: null, isAuthenticated: false, isLoading: false }),
}));
