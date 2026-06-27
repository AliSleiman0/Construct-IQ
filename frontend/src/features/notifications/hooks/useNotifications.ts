import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/notifications.api';
import { useAuthStore } from '@/store/auth.store';

export interface AppNotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  entityType?: string | null;
  entityId?: string | null;
}

/**
 * Current user's in-app notifications. Gated on `isAuthenticated` so it never
 * fires on /login (which would trigger the 401 → refresh → redirect loop —
 * see frontend/CLAUDE.md). Polls hourly to surface new domain events.
 */
export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list() as Promise<AppNotification[]>,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
