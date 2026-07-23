import { useQuery } from '@tanstack/react-query';
import { unitsApi } from '@/lib/api/units.api';
import { useAuthStore } from '@/store/auth.store';
import type { UnitStatus } from '@/types/unit.types';

/**
 * Units visible to the current user.
 *
 * No buyer id is passed: the backend scopes this per caller (`UnitViewer`), so
 * a CLIENT receives only the units they bought while a PM receives the whole
 * project. Gated on `isAuthenticated` per the project-wide query rule — an
 * ungated query mounted inside a provider 401s on /login and traps the app in
 * a refresh→redirect loop.
 */
export function useUnits(params?: { projectId?: string; status?: UnitStatus }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['units', params?.projectId ?? null, params?.status ?? null],
    queryFn: () => unitsApi.list(params),
    enabled: isAuthenticated,
  });
}

export function useUnit(id?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['units', id],
    queryFn: () => unitsApi.getById(id as string),
    enabled: isAuthenticated && !!id,
  });
}

/**
 * The signed-in buyer's own unit — the `/client/my-property` case.
 * Server-side scoping already narrows the list, so the first row is theirs.
 */
export function useMyUnit() {
  const query = useUnits();
  return { ...query, data: query.data?.[0] ?? null };
}
