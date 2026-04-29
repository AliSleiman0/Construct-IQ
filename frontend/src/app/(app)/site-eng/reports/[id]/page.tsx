'use client';

import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReportDetail } from '@/features/site-reports/components/ReportDetail';

export default function SiteEngReportDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  return (
    <Box>
      <PageHeader
        title="Report detail"
        breadcrumbs={[{ label: 'Daily Reports', href: '/site-eng/reports' }, { label: id }]}
        actions={
          <Button component={Link} href="/site-eng/reports" startIcon={<ArrowBackIcon />} variant="text">
            Back to reports
          </Button>
        }
      />
      <ReportDetail reportId={id} />
    </Box>
  );
}
