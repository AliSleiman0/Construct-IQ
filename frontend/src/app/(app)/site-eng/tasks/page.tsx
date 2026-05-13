'use client';

import { Box } from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModulePreview } from '@/features/placeholders/components/ModulePreview';

export default function SiteEngTasksPage() {
  return (
    <Box>
      <PageHeader title="My Tasks" subtitle="Tasks assigned to you on Tower Heights." />
      <ModulePreview
        title="Tasks"
        description="View tasks assigned to you, mark progress, and request inspections. Coming soon."
        icon={TaskAltIcon}
        statCards={[
          { label: 'Open', value: '9' },
          { label: 'Blocking', value: '3' },
          { label: 'Done (week)', value: '6' },
        ]}
        comingSoon="Phase 3 — Tasks"
      />
    </Box>
  );
}
