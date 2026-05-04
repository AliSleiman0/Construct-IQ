'use client';
import { Chip } from '@mui/material';
import type { ProjectStatus } from '@/types/project.types';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: 'default' | 'primary' | 'warning' | 'success' | 'error' }> = {
  PLANNING: { label: 'Planning', color: 'default' },
  ACTIVE: { label: 'Active', color: 'success' },
  ON_HOLD: { label: 'On Hold', color: 'warning' },
  COMPLETED: { label: 'Completed', color: 'primary' },
  CANCELLED: { label: 'Cancelled', color: 'error' },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'default' };
  return <Chip label={config.label} color={config.color} size="small" />;
}
