'use client';

import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { SuppliersPanel } from '@/features/procurement/components/SuppliersPanel';
import { PurchaseOrdersPanel } from '@/features/procurement/components/PurchaseOrdersPanel';
import { DeliveriesPanel } from '@/features/procurement/components/DeliveriesPanel';
import { useAuthStore } from '@/store/auth.store';

export default function PMProcurementPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const can = (p: string) => isSuperAdmin || hasPermission(p);

  const [tab, setTab] = useState(0);

  return (
    <Box>
      <PageHeader title="Procurement" subtitle="Suppliers, purchase orders, and deliveries for your projects." />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Suppliers" />
        <Tab label="Purchase Orders" />
        <Tab label="Deliveries" />
      </Tabs>

      {tab === 0 && <SuppliersPanel canManage={can('manage:suppliers')} />}
      {tab === 1 && (
        <PurchaseOrdersPanel
          canCreate={can('create:purchase_orders')}
          canApprove={can('approve:purchase_orders')}
          canManage={can('manage:purchase_orders')}
        />
      )}
      {tab === 2 && <DeliveriesPanel canManage={can('manage:deliveries')} />}
    </Box>
  );
}
