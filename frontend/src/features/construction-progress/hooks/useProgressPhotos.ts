import { useQuery } from '@tanstack/react-query';
import { progressPhotosApi } from '@/lib/api/progressPhotos.api';
import { useAuthStore } from '@/store/auth.store';

/**
 * Construction progress photos.
 *
 * Progress photos are project-level, and a buyer belongs to no project — so the
 * backend treats the projects they bought a unit in as visible too. Without
 * that a client would see an empty gallery for their own building.
 */
export function useProgressPhotos(params?: { projectId?: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['progress-photos', params?.projectId ?? null],
    queryFn: () => progressPhotosApi.list(params),
    enabled: isAuthenticated,
  });
}
