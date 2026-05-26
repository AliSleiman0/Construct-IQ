'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { IssueListView } from '@/features/issues/components/IssueListView';

export default function SiteEngIssuesPage() {
  return (
    <Box>
      <PageHeader
        title="Issues"
        subtitle="Report and track issues on your assigned projects."
      />
      <IssueListView detailBasePath="/site-eng/issues" />
    </Box>
  );
}
