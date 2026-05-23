'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { IssueBoardList } from '@/features/issues/components/IssueBoardList';

export default function PMIssuesPage() {
  return (
    <Box>
      <PageHeader
        title="Issues"
        subtitle="Triage and escalate issues across your projects."
      />
      <IssueBoardList detailBasePath="/pm/issues" />
    </Box>
  );
}
