'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { useCompanyStore } from '@/store/company.store';

export function useLogout() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearSelectedCompany = useCompanyStore((s) => s.clearSelectedCompany);

  const mutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearAuth();
      clearSelectedCompany();
      queryClient.clear();
    },
    onError: () => {
      clearAuth();
      clearSelectedCompany();
      queryClient.clear();
      enqueueSnackbar('Logout failed. Please try again.', { variant: 'warning' });
    },
  });

  return {
    logout: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
