import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users.api';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types/user.types';

/** Fetches the authenticated user's own profile (`GET /users/me`).
 *  Gated on auth state to avoid firing on unauthenticated routes — same
 *  pattern as useOrgSettings, which otherwise drives an infinite redirect
 *  loop on /login. */
export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<User>({
    queryKey: ['me'],
    queryFn: usersApi.getMe,
    enabled: isAuthenticated,
  });
}
