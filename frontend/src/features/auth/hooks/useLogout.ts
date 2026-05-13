'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

/** Wipe all auth-related cookies client-side as a fallback. */
const clearAuthCookies = () => {
  if (typeof document === 'undefined') return;
  const cookies = ['logged_in', 'is_super_admin', 'selected_org_id'];
  for (const name of cookies) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
  }
};

export function useLogout() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const logoutFromStore = useAuthStore((s) => s.logout);

  const mutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logoutFromStore();
      queryClient.clear();
      clearAuthCookies();
    },
    onError: () => {
      // Even if the network call fails, drop local state so the UI doesn't
      // appear "logged in" against a server that's already revoked the session.
      logoutFromStore();
      queryClient.clear();
      clearAuthCookies();
      enqueueSnackbar('Logout failed. Please try again.', { variant: 'warning' });
    },
  });

  return {
    logout: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
