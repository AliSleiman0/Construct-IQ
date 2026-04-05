'use client';

import { AppBadge } from '@/components/ui/AppBadge';
import type { UserStatus } from '@/types/user.types';

const STATUS_CONFIG: Record<UserStatus, { label: string; color: 'success' | 'warning' | 'error' }> = {
  ACTIVE: { label: 'Active', color: 'success' },
  INACTIVE: { label: 'Inactive', color: 'warning' },
  SUSPENDED: { label: 'Suspended', color: 'error' },
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.INACTIVE;
  return <AppBadge label={config.label} color={config.color} />;
}
