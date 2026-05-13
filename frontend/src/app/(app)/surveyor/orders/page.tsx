'use client';

import { Box } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function SurveyorOrdersPage() {
  return (
    <Box>
      <PageHeader title="Purchase Orders" subtitle="Review and approve POs from a QS perspective." />
      <ModulePreview
        title="PO review"
        description="Approve POs against the BOQ, flag overruns, and link procurement to budget categories. Coming soon."
        icon={ShoppingCartIcon}
        statCards={[
          { label: 'Awaiting review', value: '4' },
          { label: 'Approved (30d)', value: '21' },
          { label: 'Flagged', value: '2' },
        ]}
        comingSoon="Phase 5 — Quantity Surveyor"
      />
    </Box>
  );
}
