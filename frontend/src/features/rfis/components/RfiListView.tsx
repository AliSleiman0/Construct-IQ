'use client';

import { useMemo, useState } from 'react';
import { Box, Stack, Paper, Typography, Chip, TextField, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useRfis, useCreateRfi } from '@/features/rfis/hooks/useRfis';
import { RaiseRfiModal } from '@/features/rfis/components/RfiModals';
import { useAuthStore } from '@/store/auth.store';
import {
  RFI_STATUSES,
  RFI_STATUS_LABEL,
  RFI_DISCIPLINE_LABEL,
  type Rfi,
  type RfiStatus,
} from '@/types/rfi.types';

const STATUS_COLOR: Record<RfiStatus, 'default' | 'success' | 'warning'> = {
  OPEN: 'warning',
  ANSWERED: 'success',
  CLOSED: 'default',
};

/**
 * Project-scoped RFI register for a Site Engineer: pick an assigned project →
 * see its RFIs → raise new ones. Member-scoped server-side. Answering is a
 * manager-only action and lives on the detail page.
 */
export function RfiListView() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = useState('');
  const effectiveProjectId = projectId || projects?.[0]?.id || '';

  const { data: rfis, isLoading, isError, refetch } = useRfis(
    effectiveProjectId ? { projectId: effectiveProjectId } : undefined,
  );
  const createRfi = useCreateRfi();

  const isSuperAdmin = useAuthStore((s) => s.user?.isSuperAdmin ?? false);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = isSuperAdmin || hasPermission('create:rfis');

  const [statusFilter, setStatusFilter] = useState<'ALL' | RfiStatus>('ALL');
  const [raiseOpen, setRaiseOpen] = useState(false);

  const filtered = useMemo(() => {
    return (rfis ?? []).filter((r: Rfi) => statusFilter === 'ALL' || r.status === statusFilter);
  }, [rfis, statusFilter]);

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
            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | RfiStatus)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">All statuses</MenuItem>
          {RFI_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>{RFI_STATUS_LABEL[s]}</MenuItem>
          ))}
        </TextField>
        <Box flex={1} />
        {canCreate && (
          <AppButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setRaiseOpen(true)}
            disabled={!effectiveProjectId}
          >
            Raise RFI
          </AppButton>
        )}
      </Stack>

      {isLoading ? (
        <AppLoader />
      ) : isError ? (
        <AppErrorState onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={5}>
          <Typography variant="body2" color="text.secondary">
            No RFIs yet for this project.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          {filtered.map((rfi) => (
            <Paper key={rfi.id} elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                <Chip label={rfi.number} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                <Chip label={RFI_DISCIPLINE_LABEL[rfi.discipline]} size="small" variant="outlined" />
                <Chip label={RFI_STATUS_LABEL[rfi.status]} size="small" color={STATUS_COLOR[rfi.status]} sx={{ fontWeight: 600 }} />
              </Box>
              <Typography
                variant="subtitle1"
                fontWeight={600}
                mb={0.5}
                component={Link}
                href={`/site-eng/rfis/${rfi.id}`}
                sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
              >
                {rfi.subject}
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                {rfi.dueBy && (
                  <Box display="flex" alignItems="center" gap={0.5} color="text.secondary">
                    <EventIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption">Due {dayjs(rfi.dueBy).format('MMM D, YYYY')}</Typography>
                  </Box>
                )}
                {rfi.respondent && (
                  <Typography variant="caption" color="text.secondary">
                    To {rfi.respondent.firstName} {rfi.respondent.lastName}
                  </Typography>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      <RaiseRfiModal
        open={raiseOpen}
        isLoading={createRfi.isPending}
        error={createRfi.isError ? 'Could not raise the RFI. Try again.' : null}
        projectId={effectiveProjectId}
        onClose={() => setRaiseOpen(false)}
        onSubmit={(payload) =>
          createRfi.mutate(payload, {
            onSuccess: () => {
              setRaiseOpen(false);
              enqueueSnackbar('RFI raised.', { variant: 'success' });
            },
          })
        }
      />
    </Box>
  );
}
