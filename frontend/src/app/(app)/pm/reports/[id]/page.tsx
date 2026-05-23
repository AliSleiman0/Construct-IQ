'use client';

import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReportDetailView } from '@/features/reports/components/ReportDetailView';

export default function PMReportDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  return (
    <Box>
      <PageHeader
        title="Report detail"
        breadcrumbs={[{ label: 'Daily Reports', href: '/pm/reports' }, { label: id }]}
        actions={
          <Button component={Link} href="/pm/reports" startIcon={<ArrowBackIcon />} variant="text">
            Back
          </Button>
        }
      />
      <ReportDetailView reportId={id} />
    </Box>
  );
}
