'use client';

import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { IssueDetailView } from '@/features/issues/components/IssueDetailView';

export default function PMIssueDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  return (
    <Box>
      <PageHeader
        title="Issue detail"
        breadcrumbs={[{ label: 'Issues', href: '/pm/issues' }, { label: id }]}
        actions={
          <Button component={Link} href="/pm/issues" startIcon={<ArrowBackIcon />} variant="text">
            Back
          </Button>
        }
      />
      <IssueDetailView issueId={id} />
    </Box>
  );
}
