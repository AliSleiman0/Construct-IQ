import { create } from 'zustand';
import type { AuthState, AuthUser } from '@/types/auth.types';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user: AuthUser | null) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  clearAuth: () =>
    set({ user: null, isAuthenticated: false, isLoading: false }),

  hasPermission: (permission: string) => {
    const { user } = get();
    const perms = user?.permissions ?? [];
    // manage:all (Super Admin) and manage:company (Admin) satisfy every permission
    if (perms.includes('manage:all') || perms.includes('manage:company')) return true;
    return perms.includes(permission);
  },

  hasRole: (role: string) => {
    const { user } = get();
    return user?.roles?.includes(role) ?? false;
  },
}));
