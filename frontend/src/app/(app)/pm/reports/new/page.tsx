'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReportFormView } from '@/features/reports/components/ReportFormView';

export default function NewPMReportPage() {
  return (
    <Box>
      <PageHeader
        title="New daily report"
        breadcrumbs={[{ label: 'Daily Reports', href: '/pm/reports' }, { label: 'New' }]}
      />
      <ReportFormView successBasePath="/pm/reports" />
    </Box>
  );
}
