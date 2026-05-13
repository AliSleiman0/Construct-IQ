'use client';

import { Box } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function VariationsPage() {
  return (
    <Box>
      <PageHeader title="Variations" subtitle="Change orders against the original contract." />
      <ModulePreview
        title="Variations / Change Orders"
        description="Capture scope changes, price impact, schedule impact, and approval status. Coming soon."
        icon={SwapHorizIcon}
        statCards={[
          { label: 'Pending', value: '6', hint: '$24.8k impact' },
          { label: 'Approved', value: '14' },
          { label: 'Rejected', value: '2' },
        ]}
        comingSoon="Phase 5 — Quantity Surveyor"
      />
    </Box>
  );
}
