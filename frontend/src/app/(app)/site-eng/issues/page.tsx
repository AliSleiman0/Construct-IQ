'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { IssueList } from '@/features/site-issues/components/IssueList';

export default function SiteEngIssuesPage() {
  return (
    <Box>
      <PageHeader
        title="Issues"
        subtitle="Open issues across Tower Heights — filter by severity or status."
      />
      <IssueList detailBasePath="/site-eng/issues" />
    </Box>
  );
}
