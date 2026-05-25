'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Paper,
  Typography,
  Chip,
  TextField,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EventIcon from '@mui/icons-material/Event';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useProjects } from '@/features/projects/hooks/useProjects';
import {
  useInspections,
  useCreateInspection,
  useUpdateInspection,
} from '@/features/inspections/hooks/useInspections';
import { ScheduleInspectionModal } from '@/features/inspections/components/InspectionModals';
import { useCreateIssue } from '@/features/issues/hooks/useIssueMutations';
import { CreateIssueModal } from '@/features/issues/components/IssueModals';
import { useAuthStore } from '@/store/auth.store';
import {
  INSPECTION_STATUSES,
  INSPECTION_STATUS_LABEL,
  type Inspection,
  type InspectionStatus,
} from '@/types/inspection.types';

const STATUS_COLOR: Record<InspectionStatus, 'default' | 'success' | 'error' | 'warning'> = {
  SCHEDULED: 'warning',
  PASSED: 'success',
  FAILED: 'error',
  CANCELLED: 'default',
};

/**
 * Project-scoped inspection log for a Site Engineer: pick an assigned project →
 * see its inspections → schedule new ones and record an outcome (status doubles
 * as pass/fail). Member-scoped server-side. Thin v1 — no checklist/photos/sign-off.
 */
export function InspectionListView() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = useState('');
  const effectiveProjectId = projectId || projects?.[0]?.id || '';

  const { data: inspections, isLoading, isError, refetch } = useInspections(
    effectiveProjectId ? { projectId: effectiveProjectId } : undefined,
  );
  const createInspection = useCreateInspection();
  const updateInspection = useUpdateInspection();

  const isSuperAdmin = useAuthStore((s) => s.user?.isSuperAdmin ?? false);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = isSuperAdmin || hasPermission('create:inspections');
  const canUpdate = isSuperAdmin || hasPermission('update:inspections');
  const canRaiseIssue = isSuperAdmin || hasPermission('create:issues');

  const createIssue = useCreateIssue(effectiveProjectId);
  const [statusFilter, setStatusFilter] = useState<'ALL' | InspectionStatus>('ALL');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  // The failed inspection a deficiency issue is being raised against (SE-3).
  const [raiseFor, setRaiseFor] = useState<Inspection | null>(null);

  const filtered = useMemo(() => {
    return (inspections ?? []).filter(
      (i: Inspection) => statusFilter === 'ALL' || i.status === statusFilter,
    );
  }, [inspections, statusFilter]);

  const setStatus = (insp: Inspection, status: InspectionStatus) => {
    if (status === insp.status) return;
    updateInspection.mutate(
      { id: insp.id, payload: { status } },
      {
        onSuccess: () => enqueueSnackbar('Inspection updated.', { variant: 'success' }),
        onError: () => enqueueSnackbar('Could not update the inspection.', { variant: 'error' }),
      },
    );
  };

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
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | InspectionStatus)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">All statuses</MenuItem>
          {INSPECTION_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {INSPECTION_STATUS_LABEL[s]}
            </MenuItem>
          ))}
        </TextField>
        <Box flex={1} />
        {canCreate && (
          <AppButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setScheduleOpen(true)}
            disabled={!effectiveProjectId}
          >
            Schedule inspection
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
            No inspections yet for this project.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          {filtered.map((insp) => (
            <Paper key={insp.id} elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                <Chip label={insp.type} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                <Chip label={INSPECTION_STATUS_LABEL[insp.status]} size="small" color={STATUS_COLOR[insp.status]} sx={{ fontWeight: 600 }} />
              </Box>
              <Typography
                variant="subtitle1"
                fontWeight={600}
                mb={0.5}
                component={Link}
                href={`/site-eng/inspections/${insp.id}`}
                sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
              >
                {insp.title}
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={1.5}>
                {insp.scheduledFor && (
                  <Box display="flex" alignItems="center" gap={0.5} color="text.secondary">
                    <EventIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption">{dayjs(insp.scheduledFor).format('MMM D, YYYY')}</Typography>
                  </Box>
                )}
                {insp.location && (
                  <Box display="flex" alignItems="center" gap={0.5} color="text.secondary">
                    <LocationOnIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption">{insp.location}</Typography>
                  </Box>
                )}
                {insp.inspector && (
                  <Typography variant="caption" color="text.secondary">
                    {insp.inspector.firstName} {insp.inspector.lastName}
                  </Typography>
                )}
              </Box>
              {canUpdate && (
                <TextField
                  select
                  size="small"
                  fullWidth
                  label="Outcome"
                  value={insp.status}
                  onChange={(e) => setStatus(insp, e.target.value as InspectionStatus)}
                  disabled={updateInspection.isPending}
                >
                  {INSPECTION_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {INSPECTION_STATUS_LABEL[s]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {insp.status === 'FAILED' && canRaiseIssue && (
                <AppButton
                  variant="outlined"
                  color="error"
                  size="small"
                  fullWidth
                  sx={{ mt: 1 }}
                  onClick={() => setRaiseFor(insp)}
                >
                  Raise issue
                </AppButton>
              )}
            </Paper>
          ))}
        </Box>
      )}

      <ScheduleInspectionModal
        open={scheduleOpen}
        isLoading={createInspection.isPending}
        error={createInspection.isError ? 'Could not schedule the inspection. Try again.' : null}
        projectId={effectiveProjectId}
        onClose={() => setScheduleOpen(false)}
        onSubmit={(payload) =>
          createInspection.mutate(payload, {
            onSuccess: () => {
              setScheduleOpen(false);
              enqueueSnackbar('Inspection scheduled.', { variant: 'success' });
            },
          })
        }
      />

      {/* SE-3: raise a QUALITY issue linked back to the failed inspection. */}
      <CreateIssueModal
        open={!!raiseFor}
        isLoading={createIssue.isPending}
        error={createIssue.isError ? 'Could not raise the issue. Try again.' : null}
        defaults={raiseFor ? { type: 'QUALITY', title: `Deficiency: ${raiseFor.title}` } : undefined}
        onClose={() => setRaiseFor(null)}
        onSubmit={(values) =>
          createIssue.mutate(
            { ...values, inspectionId: raiseFor?.id },
            {
              onSuccess: () => {
                setRaiseFor(null);
                enqueueSnackbar('Issue raised from inspection.', { variant: 'success' });
              },
              onError: () => enqueueSnackbar('Could not raise the issue.', { variant: 'error' }),
            },
          )
        }
      />
    </Box>
  );
}
