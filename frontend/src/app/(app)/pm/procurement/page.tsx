'use client';

import { Box } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function PMProcurementPage() {
  return (
    <Box>
      <PageHeader title="Procurement" subtitle="Read-only POs and deliveries for your projects." />
      <ModulePreview
        title="Procurement view"
        description="See PO status, delivery ETAs, and material flow without procurement-team write access. Coming soon."
        icon={LocalShippingIcon}
        statCards={[
          { label: 'Active POs', value: '11' },
          { label: 'In transit', value: '3' },
          { label: 'Delivering today', value: '2' },
        ]}
        comingSoon="Phase 5 — Procurement"
      />
    </Box>
  );
}
