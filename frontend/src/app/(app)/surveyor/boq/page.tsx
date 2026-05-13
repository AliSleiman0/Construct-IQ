'use client';

import { Box } from '@mui/material';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function BOQPage() {
  return (
    <Box>
      <PageHeader title="Bill of Quantities" subtitle="Item-by-item quantities, rates, and totals." />
      <ModulePreview
        title="BOQ"
        description="Manage line items by trade, link to drawings, track measured quantities, and roll up to project totals."
        icon={ListAltIcon}
        statCards={[
          { label: 'Total items', value: '412' },
          { label: 'Locked', value: '378' },
          { label: 'Pending review', value: '34' },
        ]}
        comingSoon="Phase 5 — Quantity Surveyor"
      />
    </Box>
  );
}
