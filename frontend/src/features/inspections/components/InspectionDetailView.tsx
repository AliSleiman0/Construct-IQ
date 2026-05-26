'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  Button,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useInspection, useUpdateInspection } from '@/features/inspections/hooks/useInspections';
import { EditInspectionModal } from '@/features/inspections/components/InspectionModals';
import { useAllIssues } from '@/features/issues/hooks/useIssues';
import { useCreateIssue } from '@/features/issues/hooks/useIssueMutations';
import { CreateIssueModal } from '@/features/issues/components/IssueModals';
import { useAuthStore } from '@/store/auth.store';
import { INSPECTION_STATUS_LABEL, type InspectionStatus } from '@/types/inspection.types';
import type { Issue } from '@/types/issue.types';

const STATUS_COLOR: Record<InspectionStatus, 'default' | 'success' | 'error' | 'warning'> = {
  SCHEDULED: 'warning',
  PASSED: 'success',
  FAILED: 'error',
  CANCELLED: 'default',
};

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Box mt={0.25}>{typeof value === 'string' ? <Typography variant="body2">{value}</Typography> : value}</Box>
    </Box>
  );
}

export function InspectionDetailView({ inspectionId, issueBasePath = '/site-eng/issues' }: { inspectionId: string; issueBasePath?: string }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: inspection, isLoading, isError, refetch } = useInspection(inspectionId);
  const { data: linkedIssues } = useAllIssues({ inspectionId });
  const updateInspection = useUpdateInspection();
  const createIssue = useCreateIssue(inspection?.projectId ?? '');

  const isSuperAdmin = useAuthStore((s) => s.user?.isSuperAdmin ?? false);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = isSuperAdmin || hasPermission('update:inspections');
  const canRaiseIssue = isSuperAdmin || hasPermission('create:issues');

  const [editOpen, setEditOpen] = useState(false);
  const [raiseOpen, setRaiseOpen] = useState(false);

  if (isLoading) return <AppLoader />;
  if (isError || !inspection) return <AppErrorState onRetry={refetch} />;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 2, alignItems: 'start' }}>
      <Stack gap={2}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
            <Chip label={inspection.type} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
            <Chip label={INSPECTION_STATUS_LABEL[inspection.status]} size="small" color={STATUS_COLOR[inspection.status]} sx={{ fontWeight: 600 }} />
          </Box>
          <Typography variant="h6" fontWeight={700}>{inspection.title}</Typography>
          {inspection.notes && (
            <Typography variant="body2" color="text.secondary" mt={1}>{inspection.notes}</Typography>
          )}
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Typography variant="subtitle2" fontWeight={600}>Issues raised from this inspection</Typography>
            {canRaiseIssue && (
              <Button size="small" color="error" startIcon={<AddIcon />} onClick={() => setRaiseOpen(true)}>
                Raise issue
              </Button>
            )}
          </Box>
          {(linkedIssues ?? []).length === 0 ? (
            <Typography variant="body2" color="text.secondary">No issues raised from this inspection.</Typography>
          ) : (
            <Stack gap={1}>
              {(linkedIssues ?? []).map((iss: Issue) => (
                <Box
                  key={iss.id}
                  component={Link}
                  href={`${issueBasePath}/${iss.id}`}
                  sx={{ display: 'flex', gap: 1, alignItems: 'center', textDecoration: 'none', color: 'inherit', p: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Chip label={iss.status} size="small" sx={{ fontWeight: 600 }} />
                  <Typography variant="body2">{iss.title}</Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1.5}>Properties</Typography>
        <Stack gap={1.5}>
          <KV label="Status" value={<Chip label={INSPECTION_STATUS_LABEL[inspection.status]} size="small" color={STATUS_COLOR[inspection.status]} sx={{ fontWeight: 600 }} />} />
          <KV label="Type" value={inspection.type} />
          {inspection.project?.name && <KV label="Project" value={inspection.project.name} />}
          <KV label="Scheduled for" value={inspection.scheduledFor ? dayjs(inspection.scheduledFor).format('MMM D, YYYY') : '—'} />
          <KV label="Inspector" value={inspection.inspector ? `${inspection.inspector.firstName} ${inspection.inspector.lastName}` : 'Unassigned'} />
          {inspection.location && <KV label="Location" value={inspection.location} />}
          {inspection.createdBy && <KV label="Created by" value={`${inspection.createdBy.firstName} ${inspection.createdBy.lastName}`} />}
          <KV label="Created" value={dayjs(inspection.createdAt).format('MMM D, YYYY HH:mm')} />
        </Stack>
        {canUpdate && (
          <Button variant="outlined" startIcon={<EditIcon />} fullWidth sx={{ mt: 2 }} onClick={() => setEditOpen(true)}>
            Edit inspection
          </Button>
        )}
      </Paper>

      <EditInspectionModal
        open={editOpen}
        isLoading={updateInspection.isPending}
        error={updateInspection.isError ? 'Could not save the inspection. Try again.' : null}
        inspection={inspection}
        onClose={() => setEditOpen(false)}
        onSubmit={(payload) =>
          updateInspection.mutate(
            { id: inspection.id, payload },
            {
              onSuccess: () => {
                setEditOpen(false);
                enqueueSnackbar('Inspection updated.', { variant: 'success' });
              },
              onError: () => enqueueSnackbar('Could not save the inspection.', { variant: 'error' }),
            },
          )
        }
      />

      <CreateIssueModal
        open={raiseOpen}
        isLoading={createIssue.isPending}
        error={createIssue.isError ? 'Could not raise the issue. Try again.' : null}
        defaults={{ type: 'QUALITY', title: `Deficiency: ${inspection.title}` }}
        onClose={() => setRaiseOpen(false)}
        onSubmit={(values) =>
          createIssue.mutate(
            { ...values, inspectionId: inspection.id },
            {
              onSuccess: () => {
                setRaiseOpen(false);
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
