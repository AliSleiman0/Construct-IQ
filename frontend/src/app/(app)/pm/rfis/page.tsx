'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { RfiListView } from '@/features/rfis/components/RfiListView';

export default function PmRfisPage() {
  return (
    <Box>
      <PageHeader title="RFIs" subtitle="Answer and track requests for information across your projects." />
      <RfiListView />
    </Box>
  );
}
