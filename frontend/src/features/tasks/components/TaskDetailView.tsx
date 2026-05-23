'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Paper, Typography, Chip, Divider, Stack, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useTask } from '../hooks/useTasks';
import { useUpdateTask, useDeleteTask } from '../hooks/useTaskMutations';
import { EditTaskModal, type TaskFormValues } from './TaskModals';
import { TaskStatusChip } from './TaskStatusChip';
import { TaskPriorityChip } from './TaskPriorityChip';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useAuthStore } from '@/store/auth.store';

export function TaskDetailView({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { data: task, isLoading, isError, refetch } = useTask(taskId);
  const { data: users } = useUsers();
  const { data: projects } = useProjects();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canUpdate = isSuperAdmin || hasPermission('update:tasks');
  const canDelete = isSuperAdmin || hasPermission('delete:tasks');

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [editOpen, setEditOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // GET /tasks/:id returns assignedToId/projectId without populate — resolve names client-side.
  const assigneeName = useMemo(() => {
    if (!task?.assignedToId) return 'Unassigned';
    const u = (users ?? []).find((x) => x.id === task.assignedToId);
    return u ? `${u.firstName} ${u.lastName}`.trim() : 'Unknown';
  }, [task?.assignedToId, users]);

  const projectName = useMemo(() => {
    if (!task) return null;
    return (projects ?? []).find((p) => p.id === task.projectId)?.name ?? null;
  }, [task, projects]);

  if (isLoading) return <AppLoader />;
  if (isError) return <AppErrorState onRetry={refetch} />;
  if (!task) {
    return (
      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6">Task not found</Typography>
      </Paper>
    );
  }

  const handleEdit = async (values: TaskFormValues) => {
    setFormError(null);
    try {
      await updateTask.mutateAsync({ id: task.id, payload: values });
      setEditOpen(false);
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? 'Failed to update task');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;
    await deleteTask.mutateAsync(task.id);
    router.push('/pm/tasks');
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
      <Stack gap={2.5}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1.5} flexWrap="wrap">
            {projectName && (
              <Chip label={projectName} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
            <TaskStatusChip status={task.status} />
            <TaskPriorityChip priority={task.priority} />
          </Box>
          <Typography variant="h5" fontWeight={700} mb={1}>
            {task.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Assigned to <strong>{assigneeName}</strong> · created {dayjs(task.createdAt).format('MMM D, YYYY HH:mm')}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body1" color={task.description ? 'text.primary' : 'text.secondary'}>
            {task.description || 'No description.'}
          </Typography>
        </Paper>
      </Stack>

      <Stack gap={2}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            Properties
          </Typography>
          <Stack gap={1.5}>
            <KV label="Status" value={<TaskStatusChip status={task.status} />} />
            <KV label="Priority" value={<TaskPriorityChip priority={task.priority} />} />
            <KV label="Assignee" value={assigneeName} />
            <KV label="Due date" value={task.dueDate ? dayjs(task.dueDate).format('MMM D, YYYY') : '—'} />
            <KV label="Created" value={dayjs(task.createdAt).format('MMM D, YYYY HH:mm')} />
            <KV label="Updated" value={dayjs(task.updatedAt).format('MMM D, YYYY HH:mm')} />
          </Stack>

          {(canUpdate || canDelete) && (
            <Stack gap={1} mt={2}>
              {canUpdate && (
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  fullWidth
                  onClick={() => {
                    setFormError(null);
                    setEditOpen(true);
                  }}
                >
                  Edit task
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  fullWidth
                  disabled={deleteTask.isPending}
                  onClick={handleDelete}
                >
                  Delete task
                </Button>
              )}
            </Stack>
          )}
        </Paper>
      </Stack>

      <EditTaskModal
        open={editOpen}
        task={task}
        isLoading={updateTask.isPending}
        error={formError}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
      />
    </Box>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </Typography>
      <Box mt={0.25}>
        {typeof value === 'string' ? (
          <Typography variant="body2" fontWeight={500}>
            {value}
          </Typography>
        ) : (
          value
        )}
      </Box>
    </Box>
  );
}
