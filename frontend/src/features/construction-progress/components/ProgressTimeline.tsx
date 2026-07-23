'use client';

import { Box, Paper, Typography, LinearProgress } from '@mui/material';
import { useMilestones } from '@/features/projects/hooks/useMilestones';

interface ProgressTimelineProps {
  /** Derived from the buyer's own unit — null until that resolves. */
  projectId: string | null;
  projectName?: string;
}

export function ProgressTimeline({ projectId, projectName }: ProgressTimelineProps) {
  const { data: milestones, isLoading } = useMilestones(projectId);

  const list = milestones ?? [];
  const overall =
    list.length === 0
      ? 0
      : Math.round(list.reduce((sum, m) => sum + (m.percentComplete ?? 0), 0) / list.length);
  const inProgress = list.find((m) => m.status === 'IN_PROGRESS');

  return (
    <Paper
      elevation={0}
      sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
    >
      <Box display="flex" alignItems="baseline" justifyContent="space-between" mb={1.5}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {projectName ? `${projectName} · overall progress` : 'Overall progress'}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div">
            {isLoading && 'Loading…'}
            {!isLoading && list.length === 0 && 'No milestones published yet'}
            {!isLoading && list.length > 0 && (
              <>
                Currently building: <strong>{inProgress?.name ?? 'On schedule'}</strong>
              </>
            )}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight={700} color="primary.main">
          {overall}%
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={overall} sx={{ height: 12, borderRadius: 1 }} />
    </Paper>
  );
}
