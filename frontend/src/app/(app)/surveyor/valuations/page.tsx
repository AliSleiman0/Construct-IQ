'use client';

import { Box } from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function ValuationsPage() {
  return (
    <Box>
      <PageHeader title="Valuations" subtitle="Progress billing — value of work in place." />
      <ModulePreview
        title="Valuations"
        description="Calculate the value of work completed each period, generate certificates, and reconcile against contract sums. Coming soon."
        icon={CalculateIcon}
        statCards={[
          { label: 'This period', value: '$138k' },
          { label: 'Cumulative', value: '$1.42M' },
          { label: 'Retention held', value: '$71k' },
        ]}
        comingSoon="Phase 5 — Quantity Surveyor"
      />
    </Box>
  );
}
