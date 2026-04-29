'use client';

import { Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { ReportList } from '@/features/site-reports/components/ReportList';

export default function SiteEngReportsPage() {
  return (
    <Box>
      <PageHeader
        title="Daily Reports"
        subtitle="Tower Heights · daily site report log."
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
      <ReportList detailBasePath="/site-eng/reports" />
    </Box>
  );
}
