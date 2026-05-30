'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { RfiListView } from '@/features/rfis/components/RfiListView';

export default function SiteEngRfisPage() {
  return (
    <Box>
      <PageHeader title="RFIs" subtitle="Raise and track requests for information on your assigned projects." />
      <RfiListView />
    </Box>
  );
}
