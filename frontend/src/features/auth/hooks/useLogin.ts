'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import type { LoginCredentials } from '@/types/auth.types';
import { ROUTES } from '@/constants/routes';

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const setUser = useAuthStore((s) => s.setUser);

  const mutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(['auth', 'me'], data.user);
      router.push(ROUTES.DASHBOARD);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error?.message ??
        'Login failed. Please check your credentials.';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });

  return {
    login: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
