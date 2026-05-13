'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReportForm } from '@/features/site-reports/components/ReportForm';

export default function NewPMReportPage() {
  return (
    <Box>
      <PageHeader
        title="New daily report"
        breadcrumbs={[{ label: 'Daily Reports', href: '/pm/reports' }, { label: 'New' }]}
      />
      <ReportForm successBasePath="/pm/reports" />
    </Box>
  );
}
