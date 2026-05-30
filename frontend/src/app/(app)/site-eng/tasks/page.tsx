'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { MyTasksBoard } from '@/features/tasks/components/MyTasksBoard';

export default function SiteEngTasksPage() {
  return (
    <Box>
      <PageHeader title="My Tasks" subtitle="Tasks assigned to you across your projects." />
      <MyTasksBoard />
    </Box>
  );
}
