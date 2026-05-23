'use client';

import { Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { ReportBoardList } from '@/features/reports/components/ReportBoardList';

export default function PMReportsPage() {
  return (
    <Box>
      <PageHeader
        title="Daily Reports"
        subtitle="Oversight of site reports across your projects."
        actions={
          <AppButton component={Link} href="/pm/reports/new" variant="contained" startIcon={<AddIcon />}>
            New report
          </AppButton>
        }
      />
      <ReportBoardList detailBasePath="/pm/reports" />
    </Box>
  );
}
