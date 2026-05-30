'use client';

import { Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { ReportBoardList } from '@/features/reports/components/ReportBoardList';

export default function SiteEngReportsPage() {
  return (
    <Box>
      <PageHeader
        title="Daily Reports"
        subtitle="Daily site report log for your assigned projects."
        actions={
          <AppButton
            component={Link}
            href="/site-eng/reports/new"
            variant="contained"
            startIcon={<AddIcon />}
          >
            New report
          </AppButton>
        }
      />
      <ReportBoardList detailBasePath="/site-eng/reports" />
    </Box>
  );
}
