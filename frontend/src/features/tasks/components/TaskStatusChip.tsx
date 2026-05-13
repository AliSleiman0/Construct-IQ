'use client';
import { Chip } from '@mui/material';
import type { TaskStatus } from '@/types/task.types';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: 'default' | 'info' | 'error' | 'warning' | 'success' }> = {
  TODO: { label: 'To Do', color: 'default' },
  IN_PROGRESS: { label: 'In Progress', color: 'info' },
  BLOCKED: { label: 'Blocked', color: 'error' },
  REVIEW: { label: 'Review', color: 'warning' },
  DONE: { label: 'Done', color: 'success' },
};

export function TaskStatusChip({ status }: { status: TaskStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'default' };
  return <Chip label={config.label} color={config.color} size="small" />;
}
