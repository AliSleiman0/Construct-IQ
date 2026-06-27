'use client';

import { useState } from 'react';
import { Box, Button, Menu, MenuItem, Typography, Stack } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import FlagIcon from '@mui/icons-material/Flag';
import { useSnackbar } from 'notistack';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useBulkUpdateIssues } from '../hooks/useIssueMutations';
import type { IssueStatus } from '@/types/issue.types';

// CLOSED is intentionally omitted — an issue must be RESOLVED before it can be
// closed, and bulk-closing a mixed selection would violate that. Close from the
// issue detail view (RESOLVED → CLOSED) instead.
const STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
];

/** Floating bulk-action bar shown when rows are selected. */
export function IssueBulkBar({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: users } = useUsers();
  const bulk = useBulkUpdateIssues();
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [assignAnchor, setAssignAnchor] = useState<null | HTMLElement>(null);

  const run = async (payload: { status?: IssueStatus; assignedToId?: string }, msg: string) => {
    setStatusAnchor(null);
    setAssignAnchor(null);
    try {
      const res = await bulk.mutateAsync({ ids, ...payload });
      enqueueSnackbar(`${msg} (${res.modified})`, { variant: 'success' });
      onDone();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message ?? 'Bulk update failed', { variant: 'error' });
    }
  };

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, mb: 1.5,
        borderRadius: 2, border: '1px solid', borderColor: 'primary.light',
        bgcolor: 'primary.50',
      }}
    >
      <Typography variant="body2" fontWeight={600}>{ids.length} selected</Typography>
      <Stack direction="row" gap={1} sx={{ ml: 'auto' }}>
        <Button size="small" startIcon={<PersonIcon />} disabled={bulk.isPending}
          onClick={(e) => setAssignAnchor(e.currentTarget)}>
          Assign
        </Button>
        <Button size="small" startIcon={<FlagIcon />} disabled={bulk.isPending}
          onClick={(e) => setStatusAnchor(e.currentTarget)}>
          Set status
        </Button>
      </Stack>

      <Menu anchorEl={assignAnchor} open={!!assignAnchor} onClose={() => setAssignAnchor(null)}>
        <MenuItem onClick={() => run({ assignedToId: '' }, 'Unassigned')}>Unassign</MenuItem>
        {(users ?? []).map((u) => (
          <MenuItem key={u.id} onClick={() => run({ assignedToId: u.id }, `Assigned to ${u.firstName} ${u.lastName}`)}>
            {u.firstName} {u.lastName}
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={statusAnchor} open={!!statusAnchor} onClose={() => setStatusAnchor(null)}>
        {STATUS_OPTIONS.map((s) => (
          <MenuItem key={s.value} onClick={() => run({ status: s.value }, `Set to ${s.label}`)}>
            {s.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
