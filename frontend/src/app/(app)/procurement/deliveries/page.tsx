'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { DeliveriesPanel } from '@/features/procurement/components/DeliveriesPanel';
import { useAuthStore } from '@/store/auth.store';

export default function DeliveriesPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canManage = isSuperAdmin || hasPermission('manage:deliveries');

  return (
    <Box>
      <PageHeader title="Deliveries" subtitle="Inbound shipments and acceptance status." />
      <DeliveriesPanel canManage={canManage} />
    </Box>
  );
}
