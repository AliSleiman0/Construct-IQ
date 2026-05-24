'use client';
import { useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Avatar, Typography, Stack, IconButton, Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { TaskStatusChip } from './TaskStatusChip';
import { TaskPriorityChip } from './TaskPriorityChip';
import { useUsers } from '@/features/users/hooks/useUsers';
import type { Task } from '@/types/task.types';

interface TaskTableProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskTable({ tasks, onEdit, onDelete }: TaskTableProps) {
  // The task list is lean (no populated assignee) — resolve names client-side
  // from assignedToId, mirroring TaskDetailView.
  const { data: users } = useUsers();
  const usersById = useMemo(
    () => new Map((users ?? []).map((u) => [u.id, u])),
    [users],
  );

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'grey.50' } }}>
            <TableCell>Title</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Priority</TableCell>
            <TableCell>Assignee</TableCell>
            <TableCell>Due Date</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => {
            const assignee = task.assignedTo ?? (task.assignedToId ? usersById.get(task.assignedToId) : undefined);
            return (
            <TableRow key={task.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>{task.title}</Typography>
                {task.description && (
                  <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 300 }}>
                    {task.description}
                  </Typography>
                )}
              </TableCell>
              <TableCell><TaskStatusChip status={task.status} /></TableCell>
              <TableCell><TaskPriorityChip priority={task.priority} /></TableCell>
              <TableCell>
                {assignee ? (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar src={assignee.avatarUrl ?? undefined} sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                      {assignee.firstName[0]}{assignee.lastName[0]}
                    </Avatar>
                    <Typography variant="caption">{assignee.firstName} {assignee.lastName}</Typography>
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary">Unassigned</Typography>
                )}
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" justifyContent="flex-end">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => onEdit(task)}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => onDelete(task)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
