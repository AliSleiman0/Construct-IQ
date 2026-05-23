'use client';

import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useAllIssues } from '@/features/issues/hooks/useIssues';
import type { Issue, IssueSeverity, IssueStatus, UserRef } from '@/types/issue.types';
import { IssueSeverityBadge, IssueStatusBadge } from './IssueBadges';

interface IssueBoardListProps {
  detailBasePath: string;
}

const SEVERITIES: ('ALL' | IssueSeverity)[] = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES: ('ALL' | IssueStatus)[] = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

function userName(u?: UserRef | null): string {
  if (!u) return 'Unknown';
  return `${u.firstName} ${u.lastName}`.trim() || 'Unknown';
}

export function IssueBoardList({ detailBasePath }: IssueBoardListProps) {
  const { data: issues, isLoading, isError, refetch } = useAllIssues();
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<'ALL' | IssueSeverity>('ALL');
  const [status, setStatus] = useState<'ALL' | IssueStatus>('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (issues ?? []).filter((i: Issue) => {
      if (severity !== 'ALL' && i.severity !== severity) return false;
      if (status !== 'ALL' && i.status !== status) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        (i.location ?? '').toLowerCase().includes(q) ||
        (i.trade ?? '').toLowerCase().includes(q) ||
        (i.project?.name ?? '').toLowerCase().includes(q) ||
        userName(i.createdBy).toLowerCase().includes(q)
      );
    });
  }, [issues, search, severity, status]);

  if (isLoading) return <AppLoader />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2}>
        <TextField
          size="small"
          placeholder="Search by title, project, location, trade…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 240 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          size="small"
          select
          label="Severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as 'ALL' | IssueSeverity)}
          sx={{ minWidth: 150 }}
        >
          {SEVERITIES.map((s) => (
            <MenuItem key={s} value={s}>
              {s === 'ALL' ? 'All severities' : s.toLowerCase()}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'ALL' | IssueStatus)}
          sx={{ minWidth: 150 }}
        >
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s.replace('_', ' ').toLowerCase()}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {filtered.length === 0 && (
        <Box textAlign="center" py={5}>
          <Typography variant="body2" color="text.secondary">
            No issues match the current filters.
          </Typography>
        </Box>
      )}

      <Stack gap={1.5}>
        {filtered.map((iss) => (
          <Paper
            key={iss.id}
            elevation={0}
            component={Link}
            href={`${detailBasePath}/${iss.id}`}
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: iss.severity === 'CRITICAL' ? 'error.light' : 'divider',
              bgcolor: iss.severity === 'CRITICAL' ? 'rgba(239,68,68,0.04)' : 'background.paper',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
              '&:hover': { borderColor: 'primary.light', boxShadow: '0 4px 8px -4px rgba(0,0,0,0.08)' },
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5} mb={1} flexWrap="wrap">
              {iss.project?.name && (
                <Typography variant="caption" sx={{ fontWeight: 600 }} color="text.secondary">
                  {iss.project.name}
                </Typography>
              )}
              <IssueSeverityBadge severity={iss.severity} />
              <IssueStatusBadge status={iss.status} />
            </Box>
            <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
              {iss.title}
            </Typography>
            {iss.description && (
              <Typography variant="body2" color="text.secondary" mb={1}>
                {iss.description}
              </Typography>
            )}
            <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
              {iss.location && (
                <Box display="flex" alignItems="center" gap={0.5} color="text.secondary">
                  <LocationOnIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption">{iss.location}</Typography>
                </Box>
              )}
              {iss.trade && (
                <Typography variant="caption" color="text.secondary">
                  {iss.trade}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {userName(iss.createdBy)} · {dayjs(iss.createdAt).format('MMM D')}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
