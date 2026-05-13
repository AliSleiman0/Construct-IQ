'use client';

import { Box } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function InspectionsPage() {
  return (
    <Box>
      <PageHeader title="Inspections" subtitle="Required inspections and sign-offs." />
      <ModulePreview
        title="Inspections"
        description="Schedule and track inspections, capture sign-off photos, and route deficiencies as issues. Coming soon."
        icon={FactCheckIcon}
        statCards={[
          { label: 'Scheduled', value: '2' },
          { label: 'Pending sign-off', value: '2' },
          { label: 'Failed (30d)', value: '0' },
        ]}
        comingSoon="Phase 4 — QA/QC"
      />
    </Box>
  );
}
