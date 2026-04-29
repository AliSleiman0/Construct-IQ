'use client';

import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { IssueDetail } from '@/features/site-issues/components/IssueDetail';

export default function SiteEngIssueDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  return (
    <Box>
      <PageHeader
        title="Issue detail"
        breadcrumbs={[{ label: 'Issues', href: '/site-eng/issues' }, { label: id }]}
        actions={
          <Button component={Link} href="/site-eng/issues" startIcon={<ArrowBackIcon />} variant="text">
            Back
          </Button>
        }
      />
      <IssueDetail issueId={id} />
    </Box>
  );
}
