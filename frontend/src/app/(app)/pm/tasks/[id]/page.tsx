'use client';

import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { TaskDetailView } from '@/features/tasks/components/TaskDetailView';

export default function PMTaskDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  return (
    <Box>
      <PageHeader
        title="Task detail"
        breadcrumbs={[{ label: 'Tasks', href: '/pm/tasks' }, { label: id }]}
        actions={
          <Button component={Link} href="/pm/tasks" startIcon={<ArrowBackIcon />} variant="text">
            Back
          </Button>
        }
      />
      <TaskDetailView taskId={id} />
    </Box>
  );
}
