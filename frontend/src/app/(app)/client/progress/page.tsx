'use client';

import { Box, Stack } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProgressTimeline } from '@/features/construction-progress/components/ProgressTimeline';
import { MilestoneList } from '@/features/construction-progress/components/MilestoneList';
import { PhotoGallery } from '@/features/construction-progress/components/PhotoGallery';

export default function ClientProgressPage() {
  return (
    <Box>
      <PageHeader
        title="Construction Progress"
        subtitle="Photos and milestones for Tower Heights."
      />

      <Stack gap={4}>
        <ProgressTimeline />
        <MilestoneList />
        <PhotoGallery />
      </Stack>
    </Box>
  );
}
