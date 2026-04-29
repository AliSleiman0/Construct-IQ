'use client';

import { useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';
import type { AuthUser } from '@/types/auth.types';

interface AuthHydratorProps {
  user: AuthUser;
  children: React.ReactNode;
}

/**
 * Synchronously seeds the auth store from the user object resolved by
 * the (app)/layout.tsx Server Component. Runs once on render — without
 * useEffect — so the first paint already has the correct role and
 * sidebar, eliminating any "flash of wrong content".
 */
export function AuthHydrator({ user, children }: AuthHydratorProps) {
  const seeded = useRef(false);
  if (!seeded.current) {
    useAuthStore.getState().hydrateFromUser(user);
    seeded.current = true;
  }
  return <>{children}</>;
}
