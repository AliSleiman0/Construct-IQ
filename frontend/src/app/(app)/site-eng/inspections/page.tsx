'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { InspectionListView } from '@/features/inspections/components/InspectionListView';

export default function InspectionsPage() {
  return (
    <Box>
      <PageHeader title="Inspections" subtitle="Schedule and record inspections on your assigned projects." />
      <InspectionListView />
    </Box>
  );
}
