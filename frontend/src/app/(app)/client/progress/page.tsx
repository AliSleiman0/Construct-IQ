'use client';

import { Box, Paper, Stack, Typography } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProgressTimeline } from '@/features/construction-progress/components/ProgressTimeline';
import { MilestoneList } from '@/features/construction-progress/components/MilestoneList';
import { PhotoGallery } from '@/features/construction-progress/components/PhotoGallery';
import { AppLoader } from '@/components/ui/AppLoader';
import { useMyUnit } from '@/features/units/hooks/useUnits';
import { useProject } from '@/features/projects/hooks/useProjects';

export default function ClientProgressPage() {
  // The buyer's project is derived from the unit they own — the units endpoint
  // is buyer-scoped server-side, so this resolves to their building only.
  const { data: unit, isLoading } = useMyUnit();
  const { data: project } = useProject(unit?.projectId ?? null);

  if (isLoading) return <AppLoader />;

  if (!unit) {
    return (
      <Box>
        <PageHeader title="Construction Progress" />
        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body1">
            You don&apos;t have a unit yet, so there is no build to follow.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Construction Progress"
        subtitle={
          project ? `Photos and milestones for ${project.name}.` : 'Photos and milestones for your building.'
        }
      />

      <Stack gap={4}>
        <ProgressTimeline projectId={unit.projectId} projectName={project?.name} />
        <MilestoneList projectId={unit.projectId} />
        <PhotoGallery projectId={unit.projectId} />
      </Stack>
    </Box>
  );
}
