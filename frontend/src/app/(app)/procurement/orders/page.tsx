'use client';

import { Box } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function PurchaseOrdersPage() {
  return (
    <Box>
      <PageHeader title="Purchase Orders" subtitle="Issued POs across all active projects." />
      <ModulePreview
        title="Purchase Order workflow"
        description="Issue POs, route for approval, track delivery, and reconcile against supplier invoices. Coming soon."
        icon={ShoppingCartIcon}
        statCards={[
          { label: 'Active POs', value: '18', hint: '$284k committed' },
          { label: 'Awaiting approval', value: '4' },
          { label: 'Closed (30d)', value: '23' },
        ]}
        comingSoon="Phase 5 — Procurement"
      />
    </Box>
  );
}
