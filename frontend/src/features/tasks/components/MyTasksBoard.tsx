'use client';

import { useMemo } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  TextField,
  MenuItem,
} from '@mui/material';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useTasks } from '@/features/tasks/hooks/useTasks';
import { useUpdateTask } from '@/features/tasks/hooks/useTaskMutations';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useAuthStore } from '@/store/auth.store';
import { BOARD_COLUMNS } from '@/features/tasks/components/board/board.constants';
import type { Task, TaskStatus, TaskPriority } from '@/types/task.types';

const PRIORITY_COLOR: Record<TaskPriority, 'default' | 'info' | 'warning' | 'error'> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
};

/**
 * "My Tasks" for a Site Engineer: the tasks assigned to the current user across
 * their assigned projects, grouped by status. Read + update-status only — a
 * field role can mark progress but cannot create tasks or reassign them
 * (no create:tasks / assign:tasks), so there are no create/assign affordances.
 * Member-scoping is enforced server-side; the assignee filter is the user's own id.
 */
export function MyTasksBoard() {
  const { enqueueSnackbar } = useSnackbar();
  const meId = useAuthStore((s) => s.user?.id ?? '');
  const { data: tasks, isLoading, isError, refetch } = useTasks({ assignedToId: meId || undefined });
  const { data: projects } = useProjects();
  const updateTask = useUpdateTask();

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects ?? []) map.set(p.id, p.name);
    return map;
  }, [projects]);

  const byStatus = useMemo(() => {
    const groups = new Map<TaskStatus, Task[]>();
    for (const col of BOARD_COLUMNS) groups.set(col.id, []);
    for (const t of tasks ?? []) {
      if (!groups.has(t.status)) groups.set(t.status, []);
      groups.get(t.status)!.push(t);
    }
    return groups;
  }, [tasks]);

  const moveTask = (task: Task, status: TaskStatus) => {
    if (status === task.status) return;
    updateTask.mutate(
      { id: task.id, payload: { status } },
      {
        onSuccess: () => enqueueSnackbar('Task updated.', { variant: 'success' }),
        onError: () => enqueueSnackbar('Could not update the task.', { variant: 'error' }),
      },
    );
  };

  if (isLoading) return <AppLoader />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  if ((tasks ?? []).length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="body2" color="text.secondary">
          No tasks are assigned to you yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
      {BOARD_COLUMNS.map((col) => {
        const items = byStatus.get(col.id) ?? [];
        return (
          <Box key={col.id} sx={{ minWidth: 280, width: 280, flexShrink: 0 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <Typography variant="subtitle2" fontWeight={700}>
                {col.label}
              </Typography>
              <Chip label={items.length} size="small" sx={{ height: 20, fontWeight: 600 }} />
            </Box>
            <Stack gap={1.5}>
              {items.map((t) => (
                <Paper
                  key={t.id}
                  elevation={0}
                  sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                >
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t.title}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" mb={1.5}>
                    {projectNameById.get(t.projectId) && (
                      <Chip label={projectNameById.get(t.projectId)} size="small" variant="outlined" />
                    )}
                    <Chip label={t.priority} size="small" color={PRIORITY_COLOR[t.priority]} />
                    {t.dueDate && (
                      <Typography variant="caption" color="text.secondary">
                        Due {dayjs(t.dueDate).format('MMM D')}
                      </Typography>
                    )}
                  </Box>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    label="Move to"
                    value={t.status}
                    onChange={(e) => moveTask(t, e.target.value as TaskStatus)}
                    disabled={updateTask.isPending}
                  >
                    {BOARD_COLUMNS.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Paper>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}
