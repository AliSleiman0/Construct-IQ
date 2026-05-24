'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { IssuesConsole } from '@/features/issues/components/IssuesConsole';

export default function PMIssuesPage() {
  return (
    <Box>
      <PageHeader
        title="Issues"
        subtitle="Triage and escalate issues across your projects."
      />
      <IssuesConsole detailBasePath="/pm/issues" />
    </Box>
  );
}
