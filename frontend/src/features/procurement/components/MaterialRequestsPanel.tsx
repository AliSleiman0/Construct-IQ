'use client';

import { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Stack, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Tooltip, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import { AppButton } from '@/components/ui/AppButton';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import {
  useMaterialRequests,
  useCreateMaterialRequest,
  useApproveMaterialRequest,
  useRejectMaterialRequest,
  useDeleteMaterialRequest,
} from '../hooks/useMaterialRequests';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { MRStatusChip } from './ProcurementChips';
import { CreateMaterialRequestModal } from './ProcurementModals';
import type { MaterialRequest } from '@/types/procurement.types';

function money(value?: number | null, currency = 'USD'): string {
  if (value == null) return '—';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); }
  catch { return `${currency} ${value.toLocaleString()}`; }
}

export function MaterialRequestsPanel({
  canCreate, canApprove, canManage,
}: { canCreate: boolean; canApprove: boolean; canManage: boolean }) {
  const { data: requests, isLoading, isError, refetch } = useMaterialRequests();
  const { data: projects } = useProjects();
  const createMR = useCreateMaterialRequest();
  const approveMR = useApproveMaterialRequest();
  const rejectMR = useRejectMaterialRequest();
  const deleteMR = useDeleteMaterialRequest();

  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ mr: MaterialRequest; action: 'approve' | 'reject' } | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const projectName = useMemo(() => {
    const m = new Map((projects ?? []).map((p) => [p.id, p.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [projects]);

  if (isLoading) return <Skeleton variant="rounded" height={240} />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  const rows = requests ?? [];

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="subtitle1" fontWeight={700}>Material requests</Typography>
        {canCreate && (
          <AppButton size="small" variant="contained" startIcon={<AddIcon />}
            onClick={() => { setFormError(null); setModalOpen(true); }}>
            New request
          </AppButton>
        )}
      </Box>

      {rows.length === 0 ? (
        <AppEmptyState title="No material requests" description={canCreate ? 'Create your first request.' : 'No requests yet.'} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Est. cost</TableCell>
              <TableCell>Needed by</TableCell>
              {(canApprove || canManage) && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((mr) => (
              <TableRow key={mr.id} hover>
                <TableCell><Typography variant="body2" fontWeight={500}>{mr.title}</Typography></TableCell>
                <TableCell>{projectName(mr.projectId)}</TableCell>
                <TableCell>{mr.category ?? '—'}</TableCell>
                <TableCell><MRStatusChip status={mr.status} /></TableCell>
                <TableCell align="right">{money(mr.estimatedCost, mr.currency)}</TableCell>
                <TableCell>{mr.neededByDate ? dayjs(mr.neededByDate).format('MMM D, YYYY') : '—'}</TableCell>
                {(canApprove || canManage) && (
                  <TableCell align="right">
                    {canApprove && mr.status === 'PENDING' && (
                      <>
                        <Tooltip title="Approve">
                          <span>
                            <IconButton size="small" color="success" disabled={approveMR.isPending}
                              onClick={() => { setReviewTarget({ mr, action: 'approve' }); setReviewNote(''); }}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <span>
                            <IconButton size="small" color="warning" disabled={rejectMR.isPending}
                              onClick={() => { setReviewTarget({ mr, action: 'reject' }); setReviewNote(''); }}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                    {canManage && (
                      <Tooltip title="Delete">
                        <span>
                          <IconButton size="small" color="error" disabled={deleteMR.isPending}
                            onClick={async () => { if (confirm(`Delete "${mr.title}"?`)) await deleteMR.mutateAsync(mr.id); }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateMaterialRequestModal
        open={modalOpen}
        projects={projects ?? []}
        isLoading={createMR.isPending}
        error={formError}
        onClose={() => setModalOpen(false)}
        onSubmit={async (payload) => {
          setFormError(null);
          try {
            await createMR.mutateAsync(payload);
            setModalOpen(false);
          } catch (e: any) {
            setFormError(e?.response?.data?.message ?? 'Failed to create request');
          }
        }}
      />

      <Dialog open={!!reviewTarget} onClose={() => setReviewTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {reviewTarget?.action === 'approve' ? 'Approve' : 'Reject'} &quot;{reviewTarget?.mr.title}&quot;
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Note (optional)"
            fullWidth
            multiline
            minRows={2}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton variant="outlined" onClick={() => setReviewTarget(null)}>Cancel</AppButton>
          <AppButton
            variant="contained"
            color={reviewTarget?.action === 'approve' ? 'primary' : 'error'}
            loading={approveMR.isPending || rejectMR.isPending}
            onClick={async () => {
              if (!reviewTarget) return;
              if (reviewTarget.action === 'approve') {
                await approveMR.mutateAsync({ id: reviewTarget.mr.id, reviewNote });
              } else {
                await rejectMR.mutateAsync({ id: reviewTarget.mr.id, reviewNote });
              }
              setReviewTarget(null);
            }}
          >
            {reviewTarget?.action === 'approve' ? 'Approve' : 'Reject'}
          </AppButton>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
