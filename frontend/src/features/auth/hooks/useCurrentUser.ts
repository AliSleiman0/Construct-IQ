'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    retry: false,
    staleTime: 0,             // always refetch to pick up permission changes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/**
 * Bootstraps auth state on app mount.
 * Call this once in AppLayout to hydrate Zustand from the API.
 */
export function useAuthInitializer() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  const { data, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (isLoading) {
      setLoading(true);
      return;
    }
    if (isError || !data) {
      setUser(null);
    } else {
      setUser(data);
    }
  }, [data, isLoading, isError, setUser, setLoading]);
}
