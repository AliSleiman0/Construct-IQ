'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { PurchaseOrdersPanel } from '@/features/procurement/components/PurchaseOrdersPanel';
import { useAuthStore } from '@/store/auth.store';

// Reuses the real procurement PurchaseOrdersPanel. SURVEYOR holds only
// read:purchase_orders (no create/approve/manage), so every write affordance
// gates off → a read-only PO register from the QS perspective.
export default function SurveyorOrdersPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const can = (p: string) => isSuperAdmin || hasPermission(p);

  return (
    <Box>
      <PageHeader title="Purchase Orders" subtitle="Review POs against the budget from a QS perspective." />
      <PurchaseOrdersPanel
        canCreate={can('create:purchase_orders')}
        canApprove={can('approve:purchase_orders')}
        canManage={can('manage:purchase_orders')}
      />
    </Box>
  );
}
