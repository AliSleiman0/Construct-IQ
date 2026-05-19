'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { TaskBoard } from '@/features/tasks/components/board/TaskBoard';

export default function PMTasksPage() {
  return (
    <Box>
      <PageHeader title="Tasks" subtitle="Task board across your projects." />
      <TaskBoard />
    </Box>
  );
}
