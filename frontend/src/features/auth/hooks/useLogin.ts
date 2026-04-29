'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import type { LoginCredentials } from '@/types/auth.types';

/**
 * Email + password login mutation. On success the auth store is populated
 * and the post-login route is returned (super admin -> /company-select,
 * everyone else -> their role's home).
 *
 * The cookies (access_token, refresh_token, logged_in, is_super_admin)
 * are set server-side by the NestJS /auth/login endpoint.
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const loginWithEmail = useAuthStore((s) => s.loginWithEmail);

  const mutation = useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<string> => {
      const home = await loginWithEmail(credentials);
      // New session: drop any cached query data from the previous user.
      queryClient.clear();
      return home;
    },
  });

  return {
    login: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
