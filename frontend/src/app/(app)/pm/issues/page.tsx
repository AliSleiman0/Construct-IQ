'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { IssueList } from '@/features/site-issues/components/IssueList';

export default function PMIssuesPage() {
  return (
    <Box>
      <PageHeader
        title="Issues"
        subtitle="Triage and escalate site issues across your projects."
      />
      <IssueList detailBasePath="/pm/issues" />
    </Box>
  );
}
