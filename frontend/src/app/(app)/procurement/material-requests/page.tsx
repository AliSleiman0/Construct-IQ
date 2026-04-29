'use client';

import { Box } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function MaterialRequestsPage() {
  return (
    <Box>
      <PageHeader title="Material Requests" subtitle="Inbound requests from project managers." />
      <ModulePreview
        title="Material Requests workflow"
        description="Track requests from PMs, sourcing options, quote responses, and conversion to purchase orders. Coming soon."
        icon={AssignmentIcon}
        statCards={[
          { label: 'Open', value: '12', hint: '3 awaiting quote' },
          { label: 'Quoted', value: '5', hint: 'Awaiting PM approval' },
          { label: 'Converted to PO', value: '18', hint: 'This month' },
        ]}
        comingSoon="Phase 5 — Procurement"
      />
    </Box>
  );
}
