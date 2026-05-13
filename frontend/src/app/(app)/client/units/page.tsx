'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { UnitGallery } from '@/features/units/components/UnitGallery';

export default function ClientUnitsPage() {
  return (
    <Box>
      <PageHeader
        title="Building · Tower Heights"
        subtitle="24 residences across floors 7–12. Filter to find your fit."
      />
      <UnitGallery detailBasePath="/client/units" />
    </Box>
  );
}
