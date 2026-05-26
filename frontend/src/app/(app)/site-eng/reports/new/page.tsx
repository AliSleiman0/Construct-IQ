'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReportFormView } from '@/features/reports/components/ReportFormView';

export default function NewSiteEngReportPage() {
  return (
    <Box>
      <PageHeader
        title="New daily report"
        breadcrumbs={[{ label: 'Daily Reports', href: '/site-eng/reports' }, { label: 'New' }]}
      />
      <ReportFormView successBasePath="/site-eng/reports" />
    </Box>
  );
}
