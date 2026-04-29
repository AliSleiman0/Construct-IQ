'use client';

import { Chip } from '@mui/material';
import type { IssueSeverity, IssueStatus } from '@/mocks/issues.mock';

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

const STATUS_COLOR: Record<IssueStatus, 'primary' | 'warning' | 'success'> = {
  OPEN: 'primary',
  IN_REVIEW: 'warning',
  RESOLVED: 'success',
};

const STATUS_LABEL: Record<IssueStatus, string> = {
  OPEN: 'Open',
  IN_REVIEW: 'In review',
  RESOLVED: 'Resolved',
};

export function IssueSeverityBadge({ severity }: { severity: IssueSeverity }) {
  return (
    <Chip
      label={SEVERITY_LABEL[severity]}
      size="small"
      color={SEVERITY_COLOR[severity]}
      sx={{ fontWeight: 600 }}
    />
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
