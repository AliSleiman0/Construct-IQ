'use client';
import { Chip } from '@mui/material';
import type { TaskPriority } from '@/types/task.types';

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: 'default' | 'info' | 'warning' | 'error' }> = {
  LOW: { label: 'Low', color: 'default' },
  MEDIUM: { label: 'Medium', color: 'info' },
  HIGH: { label: 'High', color: 'warning' },
  CRITICAL: { label: 'Critical', color: 'error' },
};

export function TaskPriorityChip({ priority }: { priority: TaskPriority }) {
  const config = PRIORITY_CONFIG[priority] ?? { label: priority, color: 'default' };
  return <Chip label={config.label} color={config.color} size="small" variant="outlined" />;
}
