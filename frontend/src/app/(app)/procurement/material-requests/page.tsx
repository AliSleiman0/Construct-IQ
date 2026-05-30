'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { MaterialRequestsPanel } from '@/features/procurement/components/MaterialRequestsPanel';
import { useAuthStore } from '@/store/auth.store';

export default function MaterialRequestsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const can = (p: string) => isSuperAdmin || hasPermission(p);

  return (
    <Box>
      <PageHeader title="Material Requests" subtitle="Inbound requests from project managers." />
      <MaterialRequestsPanel
        canCreate={can('create:material_requests')}
        canApprove={can('approve:material_requests')}
        canManage={can('manage:material_requests')}
      />
    </Box>
  );
}
