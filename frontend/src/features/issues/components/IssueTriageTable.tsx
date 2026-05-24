'use client';

import { useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  Paper, Checkbox, Typography, Tooltip, alpha,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useUsers } from '@/features/users/hooks/useUsers';
import type { Issue } from '@/types/issue.types';
import { IssueSeverityBadge, IssueStatusBadge } from './IssueBadges';
import { ageLabel, isStale } from '../utils/triage';

interface Props {
  issues: Issue[];
  detailBasePath: string;
  sort: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  selectable: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], select: boolean) => void;
}

const COLUMNS: { key: string; label: string; sortable: boolean; align?: 'right' }[] = [
  { key: 'severity', label: 'Sev', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'type', label: 'Type', sortable: false },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'project', label: 'Project', sortable: false },
  { key: 'assignee', label: 'Assignee', sortable: false },
  { key: 'createdAt', label: 'Age', sortable: true, align: 'right' },
];

const TYPE_LABEL: Record<string, string> = {
  GENERAL: 'General', TECHNICAL: 'Technical', QUALITY: 'Quality',
  SAFETY: 'Safety', PROCUREMENT: 'Procurement', BUDGET: 'Budget',
};

export function IssueTriageTable({
  issues, detailBasePath, sort, sortDir, onSort, selectable, selected, onToggle, onToggleAll,
}: Props) {
  const router = useRouter();
  const { data: users } = useUsers();
  const usersById = useMemo(() => new Map((users ?? []).map((u) => [u.id, u])), [users]);

  const pageIds = issues.map((i) => i.id);
  const allSelected = selectable && pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = selectable && pageIds.some((id) => selected.has(id)) && !allSelected;

  const assigneeName = (iss: Issue): string => {
    const u = iss.assignedTo ?? (iss.assignedToId ? usersById.get(iss.assignedToId) : undefined);
    return u ? `${u.firstName} ${u.lastName}`.trim() : '—';
  };

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' } }}>
            {selectable && (
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => onToggleAll(pageIds, e.target.checked)}
                  inputProps={{ 'aria-label': 'Select all on page' }}
                />
              </TableCell>
            )}
            {COLUMNS.map((c) => (
              <TableCell key={c.key} align={c.align}>
                {c.sortable ? (
                  <TableSortLabel
                    active={sort === c.key}
                    direction={sort === c.key ? sortDir : 'asc'}
                    onClick={() => onSort(c.key)}
                  >
                    {c.label}
                  </TableSortLabel>
                ) : (
                  c.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {issues.map((iss) => {
            const stale = isStale(iss);
            return (
              <TableRow
                key={iss.id}
                hover
                onClick={() => router.push(`${detailBasePath}/${iss.id}`)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: stale ? (t) => alpha(t.palette.warning.main, 0.07) : undefined,
                }}
              >
                {selectable && (
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      size="small"
                      checked={selected.has(iss.id)}
                      onChange={() => onToggle(iss.id)}
                      inputProps={{ 'aria-label': `Select ${iss.title}` }}
                    />
                  </TableCell>
                )}
                <TableCell><IssueSeverityBadge severity={iss.severity} /></TableCell>
                <TableCell><IssueStatusBadge status={iss.status} /></TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{TYPE_LABEL[iss.type] ?? iss.type}</Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 320 }}>
                  <Typography variant="body2" fontWeight={500} noWrap>{iss.title}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary" noWrap>{iss.project?.name ?? '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color={iss.assignedToId ? 'text.primary' : 'text.disabled'} noWrap>
                    {assigneeName(iss)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={stale ? 'Open and ageing' : ''} disableHoverListener={!stale} arrow>
                    <Typography
                      variant="caption"
                      color={stale ? 'warning.main' : 'text.secondary'}
                      fontWeight={stale ? 700 : 400}
                    >
                      {ageLabel(iss.createdAt)}
                    </Typography>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
