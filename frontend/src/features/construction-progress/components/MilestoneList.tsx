'use client';

import { Box, Paper, Typography, Chip, LinearProgress, Stack } from '@mui/material';
import dayjs from 'dayjs';
import { useMilestones } from '@/features/projects/hooks/useMilestones';
import { AppLoader } from '@/components/ui/AppLoader';
import type { MilestoneStatus } from '@/types/milestone.types';

// Backend statuses, not the old mock's DONE / IN_PROGRESS / UPCOMING.
const STATUS_COLOR: Record<MilestoneStatus, 'success' | 'info' | 'default'> = {
  COMPLETED: 'success',
  IN_PROGRESS: 'info',
  PENDING: 'default',
};

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  COMPLETED: 'Done',
  IN_PROGRESS: 'In progress',
  PENDING: 'Upcoming',
};

interface MilestoneListProps {
  /** Derived from the buyer's own unit — null until that resolves. */
  projectId: string | null;
}

export function MilestoneList({ projectId }: MilestoneListProps) {
  const { data: milestones, isLoading } = useMilestones(projectId);

  if (isLoading) return <AppLoader />;

  const list = milestones ?? [];

  if (list.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No milestones have been published for this project yet.
      </Typography>
    );
  }

  return (
    <Stack gap={1.5}>
      {list.map((m) => (
        <Paper
          key={m.id}
          elevation={0}
          sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} mb={1}>
            <Box flex={1} minWidth={0}>
              <Typography variant="subtitle2" fontWeight={600}>
                {m.name}
              </Typography>
              {m.description && (
                <Typography variant="caption" color="text.secondary">
                  {m.description}
                </Typography>
              )}
            </Box>
            <Chip
              label={STATUS_LABEL[m.status]}
              size="small"
              color={STATUS_COLOR[m.status]}
              sx={{ fontWeight: 600 }}
            />
          </Box>
          {m.status !== 'PENDING' && (
            <Box>
              <LinearProgress
                variant="determinate"
                value={m.percentComplete ?? 0}
                sx={{ height: 6, borderRadius: 1, mb: 0.5 }}
              />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  {m.percentComplete ?? 0}% complete
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {m.completedDate
                    ? `Completed ${dayjs(m.completedDate).format('MMM D, YYYY')}`
                    : m.targetDate
                      ? `Target ${dayjs(m.targetDate).format('MMM D, YYYY')}`
                      : ''}
                </Typography>
              </Box>
            </Box>
          )}
          {m.status === 'PENDING' && m.targetDate && (
            <Typography variant="caption" color="text.secondary">
              Target {dayjs(m.targetDate).format('MMM D, YYYY')}
            </Typography>
          )}
        </Paper>
      ))}
    </Stack>
  );
}
