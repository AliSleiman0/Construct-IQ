'use client';

import { Box, Paper, Typography, LinearProgress } from '@mui/material';
import { mockMilestones } from '@/mocks/progress.mock';

export function ProgressTimeline() {
  const overall =
    Math.round(
      mockMilestones.reduce((sum, m) => sum + m.percentComplete, 0) / mockMilestones.length,
    );
  const inProgressLabel =
    mockMilestones.find((m) => m.status === 'IN_PROGRESS')?.label ?? 'On schedule';

  return (
    <Paper
      elevation={0}
      sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
    >
      <Box display="flex" alignItems="baseline" justifyContent="space-between" mb={1.5}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            Tower Heights · overall progress
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Currently building: <strong>{inProgressLabel}</strong>
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
