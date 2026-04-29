'use client';

import { Box } from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function PMTasksPage() {
  return (
    <Box>
      <PageHeader title="Tasks" subtitle="Task board across your projects." />
      <ModulePreview
        title="Task board"
        description="Plan, assign, and track tasks across phases. Drag-drop board view + Gantt-linked dependencies. Coming soon."
        icon={TaskAltIcon}
        statCards={[
          { label: 'Open', value: '42', hint: '9 due this week' },
          { label: 'In progress', value: '17' },
          { label: 'Done (week)', value: '23' },
        ]}
        comingSoon="Phase 3 — Tasks"
      />
    </Box>
  );
}
