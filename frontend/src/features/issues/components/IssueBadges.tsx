'use client';

import { Chip } from '@mui/material';
import type { IssueSeverity, IssueStatus } from '@/types/issue.types';

const SEVERITY_COLOR: Record<IssueSeverity, 'default' | 'info' | 'warning' | 'error'> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
};
const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const STATUS_COLOR: Record<IssueStatus, 'default' | 'info' | 'warning' | 'success'> = {
  OPEN: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  CLOSED: 'default',
};
const STATUS_LABEL: Record<IssueStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export function IssueSeverityBadge({ severity }: { severity: IssueSeverity }) {
  return (
    <Chip label={SEVERITY_LABEL[severity]} size="small" color={SEVERITY_COLOR[severity]} sx={{ fontWeight: 600 }} />
  );
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return (
    <Chip
      label={STATUS_LABEL[status]}
      size="small"
      color={STATUS_COLOR[status]}
      variant="outlined"
      sx={{ fontWeight: 600 }}
    />
  );
}
