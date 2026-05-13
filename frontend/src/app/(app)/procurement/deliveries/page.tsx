'use client';

import { Box } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function DeliveriesPage() {
  return (
    <Box>
      <PageHeader title="Deliveries" subtitle="Inbound shipments and acceptance status." />
      <ModulePreview
        title="Delivery tracking"
        description="See expected delivery dates, dock availability, receipts, and discrepancy reports. Coming soon."
        icon={LocalShippingIcon}
        statCards={[
          { label: 'In transit', value: '4' },
          { label: 'Today', value: '2' },
          { label: 'Discrepancies', value: '1' },
        ]}
        comingSoon="Phase 5 — Procurement"
      />
    </Box>
  );
}
