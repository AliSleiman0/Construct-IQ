'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  MenuItem,
  InputAdornment,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useAllIssues } from '@/features/issues/hooks/useIssues';
import { useCreateIssue } from '@/features/issues/hooks/useIssueMutations';
import { IssueCardList } from '@/features/issues/components/IssueCardList';
import { CreateIssueModal } from '@/features/issues/components/IssueModals';
import { useAuthStore } from '@/store/auth.store';
import type { Issue, IssueSeverity, IssueStatus } from '@/types/issue.types';

interface IssueListViewProps {
  detailBasePath: string;
}

const SEVERITIES: ('ALL' | IssueSeverity)[] = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES: ('ALL' | IssueStatus)[] = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const STATUS_LABEL: Record<string, string> = {
  ALL: 'All statuses',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

type IssueScope = 'ALL' | 'ASSIGNED_ME' | 'RAISED_ME';
const SCOPE_OPTIONS: { value: IssueScope; label: string }[] = [
  { value: 'ALL', label: 'All issues' },
  { value: 'ASSIGNED_ME', label: 'Assigned to me' },
  { value: 'RAISED_ME', label: 'Raised by me' },
];

/**
 * Project-scoped issue list for a field role (Site Engineer): pick one of your
 * assigned projects → see its issues → report/read/update. Deliberately NOT the
 * PM triage console (no bulk reassign / org-wide summary). Member-scoping is
 * enforced server-side; the project picker only lists assigned projects.
 */
export function IssueListView({ detailBasePath }: IssueListViewProps) {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = useState('');
  const effectiveProjectId = projectId || projects?.[0]?.id || '';

  const { data: issues, isLoading, isError, refetch } = useAllIssues(
    effectiveProjectId ? { projectId: effectiveProjectId } : undefined,
  );
  const createIssue = useCreateIssue(effectiveProjectId);

  const isSuperAdmin = useAuthStore((s) => s.user?.isSuperAdmin ?? false);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const meId = useAuthStore((s) => s.user?.id ?? '');
  const canCreate = isSuperAdmin || hasPermission('create:issues');

  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<'ALL' | IssueSeverity>('ALL');
  const [status, setStatus] = useState<'ALL' | IssueStatus>('ALL');
  const [scope, setScope] = useState<IssueScope>('ALL');
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (issues ?? []).filter((i: Issue) => {
      if (scope === 'ASSIGNED_ME' && i.assignedToId !== meId) return false;
      if (scope === 'RAISED_ME' && i.createdById !== meId) return false;
      if (severity !== 'ALL' && i.severity !== severity) return false;
      if (status !== 'ALL' && i.status !== status) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        (i.location ?? '').toLowerCase().includes(q) ||
        (i.trade ?? '').toLowerCase().includes(q)
      );
    });
  }, [issues, search, severity, status, scope, meId]);

  if (!projectsLoading && (projects ?? []).length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="body2" color="text.secondary">
          You are not assigned to any projects yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2} alignItems={{ sm: 'center' }}>
        <TextField
          select
          size="small"
          label="Project"
          value={effectiveProjectId}
          onChange={(e) => setProjectId(e.target.value)}
          disabled={projectsLoading}
          sx={{ minWidth: 200 }}
        >
          {(projects ?? []).map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          placeholder="Search by title, location, trade…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField select size="small" label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value as 'ALL' | IssueSeverity)} sx={{ minWidth: 130 }}>
          {SEVERITIES.map((s) => (
            <MenuItem key={s} value={s}>{s === 'ALL' ? 'All severities' : s}</MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value as 'ALL' | IssueStatus)} sx={{ minWidth: 140 }}>
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Show"
          value={scope}
          onChange={(e) => setScope(e.target.value as IssueScope)}
          data-testid="issue-scope"
          sx={{ minWidth: 150 }}
        >
          {SCOPE_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </TextField>
        {canCreate && (
          <AppButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            disabled={!effectiveProjectId}
          >
            Report issue
          </AppButton>
        )}
      </Stack>

      {isLoading ? (
        <AppLoader />
      ) : isError ? (
        <AppErrorState onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={5}>
          <Typography variant="body2" color="text.secondary">No issues match.</Typography>
        </Box>
      ) : (
        <IssueCardList issues={filtered} detailBasePath={detailBasePath} />
      )}

      <CreateIssueModal
        open={createOpen}
        isLoading={createIssue.isPending}
        error={createIssue.isError ? 'Could not create the issue. Try again.' : null}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) =>
          createIssue.mutate(values, { onSuccess: () => setCreateOpen(false) })
        }
      />
    </Box>
  );
}
