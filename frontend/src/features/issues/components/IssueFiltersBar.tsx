'use client';

import {
  Box, Stack, TextField, MenuItem, InputAdornment, Chip, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useUsers } from '@/features/users/hooks/useUsers';
import type { IssueListParams, IssueSummary } from '@/types/issue.types';

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const TYPES = ['GENERAL', 'TECHNICAL', 'QUALITY', 'SAFETY', 'PROCUREMENT', 'BUDGET'];

const titleCase = (s: string) => s.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export type QuickFilter = 'all' | 'openCriticals' | 'unassigned';

interface Props {
  params: IssueListParams;
  searchText: string;
  onSearch: (v: string) => void;
  onPatch: (p: Partial<IssueListParams>) => void;
  summary?: IssueSummary;
  active: QuickFilter;
  onQuick: (q: QuickFilter) => void;
  view: 'table' | 'cards';
  onView: (v: 'table' | 'cards') => void;
}

export function IssueFiltersBar({
  params, searchText, onSearch, onPatch, summary, active, onQuick, view, onView,
}: Props) {
  const { data: projects } = useProjects();
  const { data: users } = useUsers();

  return (
    <Stack gap={1.5} mb={2}>
      {/* Summary quick-filter chips */}
      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
        <Chip
          label={`All${summary ? ` (${summary.total})` : ''}`}
          color={active === 'all' ? 'primary' : 'default'}
          variant={active === 'all' ? 'filled' : 'outlined'}
          onClick={() => onQuick('all')}
          size="small"
        />
        <Chip
          label={`Open criticals${summary ? ` (${summary.critical})` : ''}`}
          color={active === 'openCriticals' ? 'error' : 'default'}
          variant={active === 'openCriticals' ? 'filled' : 'outlined'}
          onClick={() => onQuick('openCriticals')}
          size="small"
        />
        <Chip
          label={`Unassigned${summary ? ` (${summary.unassigned})` : ''}`}
          color={active === 'unassigned' ? 'warning' : 'default'}
          variant={active === 'unassigned' ? 'filled' : 'outlined'}
          onClick={() => onQuick('unassigned')}
          size="small"
        />
        {summary && summary.stale > 0 && (
          <Chip label={`${summary.stale} stale`} color="warning" variant="outlined" size="small" />
        )}
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, v) => v && onView(v)}
          sx={{ ml: 'auto' }}
        >
          <ToggleButton value="table" aria-label="Table view"><ViewListIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="cards" aria-label="Card view"><ViewModuleIcon fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Filters — wrap onto 1–2 compact rows (flex-basis lets them pack + wrap). */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search title, location, trade…"
          value={searchText}
          onChange={(e) => onSearch(e.target.value)}
          sx={{ flex: '2 1 240px' }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }}
        />
        <TextField size="small" select label="Severity" value={params.severity ?? ''} sx={{ flex: '1 1 150px' }}
          onChange={(e) => onPatch({ severity: (e.target.value || undefined) as any })}>
          <MenuItem value="">All severities</MenuItem>
          {SEVERITIES.map((s) => <MenuItem key={s} value={s}>{titleCase(s)}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Status" value={params.status ?? ''} sx={{ flex: '1 1 150px' }}
          onChange={(e) => onPatch({ status: (e.target.value || undefined) as any })}>
          <MenuItem value="">All statuses</MenuItem>
          {STATUSES.map((s) => <MenuItem key={s} value={s}>{titleCase(s)}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Type" value={params.type ?? ''} sx={{ flex: '1 1 150px' }}
          onChange={(e) => onPatch({ type: (e.target.value || undefined) as any })}>
          <MenuItem value="">All types</MenuItem>
          {TYPES.map((s) => <MenuItem key={s} value={s}>{titleCase(s)}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Project" value={params.projectId ?? ''} sx={{ flex: '1 1 160px' }}
          onChange={(e) => onPatch({ projectId: e.target.value || undefined })}>
          <MenuItem value="">All projects</MenuItem>
          {(projects ?? []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Assignee" value={params.assignedToId ?? ''} sx={{ flex: '1 1 160px' }}
          onChange={(e) => onPatch({ assignedToId: e.target.value || undefined })}>
          <MenuItem value="">Anyone</MenuItem>
          <MenuItem value="NONE">Unassigned</MenuItem>
          {(users ?? []).map((u) => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
        </TextField>
      </Box>
    </Stack>
  );
}
