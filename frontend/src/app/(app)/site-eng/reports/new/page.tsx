'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReportForm } from '@/features/site-reports/components/ReportForm';

export default function NewSiteEngReportPage() {
  return (
    <Box>
      <PageHeader
        title="New daily report"
        breadcrumbs={[{ label: 'Daily Reports', href: '/site-eng/reports' }, { label: 'New' }]}
      />
      <ReportForm successBasePath="/site-eng/reports" />
    </Box>
  );
}
