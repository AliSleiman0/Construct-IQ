'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { PurchaseOrdersPanel } from '@/features/procurement/components/PurchaseOrdersPanel';
import { useAuthStore } from '@/store/auth.store';

export default function PurchaseOrdersPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const can = (p: string) => isSuperAdmin || hasPermission(p);

  return (
    <Box>
      <PageHeader title="Purchase Orders" subtitle="Issue POs, route for approval, track delivery." />
      <PurchaseOrdersPanel
        canCreate={can('create:purchase_orders')}
        canApprove={can('approve:purchase_orders')}
        canManage={can('manage:purchase_orders')}
      />
    </Box>
  );
}
