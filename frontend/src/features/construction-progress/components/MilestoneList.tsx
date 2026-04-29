'use client';

import { Box, Paper, Typography, Chip, LinearProgress, Stack } from '@mui/material';
import dayjs from 'dayjs';
import { mockMilestones, type MilestoneStatus } from '@/mocks/progress.mock';

const STATUS_COLOR: Record<MilestoneStatus, 'success' | 'info' | 'default'> = {
  DONE: 'success',
  IN_PROGRESS: 'info',
  UPCOMING: 'default',
};

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  DONE: 'Done',
  IN_PROGRESS: 'In progress',
  UPCOMING: 'Upcoming',
};

export function MilestoneList() {
  return (
    <Stack gap={1.5}>
      {mockMilestones.map((m) => (
        <Paper
          key={m.id}
          elevation={0}
          sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} mb={1}>
            <Box flex={1} minWidth={0}>
              <Typography variant="subtitle2" fontWeight={600}>
                {m.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {m.description}
              </Typography>
            </Box>
            <Chip
              label={STATUS_LABEL[m.status]}
              size="small"
              color={STATUS_COLOR[m.status]}
              sx={{ fontWeight: 600 }}
            />
          </Box>
          {m.status !== 'UPCOMING' && (
            <Box>
              <LinearProgress
                variant="determinate"
                value={m.percentComplete}
                sx={{ height: 6, borderRadius: 1, mb: 0.5 }}
              />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  {m.percentComplete}% complete
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {m.completedDate
                    ? `Completed ${dayjs(m.completedDate).format('MMM D, YYYY')}`
                    : `Target ${dayjs(m.scheduledDate).format('MMM D, YYYY')}`}
                </Typography>
              </Box>
            </Box>
          )}
          {m.status === 'UPCOMING' && (
            <Typography variant="caption" color="text.secondary">
              Target {dayjs(m.scheduledDate).format('MMM D, YYYY')}
            </Typography>
          )}
        </Paper>
      ))}
    </Stack>
  );
}
