'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem, Skeleton, Paper, Typography,
  Table, TableHead, TableBody, TableRow, TableCell, Stack, TextField,
  type SelectChangeEvent,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppModal } from '@/components/ui/AppModal';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useAuthStore } from '@/store/auth.store';
import { useDeliveries, useConfirmDelivery } from '../hooks/useDeliveries';
import { DeliveryStatusChip } from './ProcurementChips';
import type { Delivery } from '@/types/procurement.types';

/**
 * SE-7: site-engineer deliveries. The list is member-scoped server-side (a site
 * engineer only sees deliveries for POs on their projects) and each row is
 * enriched with its PO number + projectId so we can identify and project-filter
 * without read:purchase_orders. The only action is a narrow "Confirm receipt".
 */
export function SiteEngDeliveriesView() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canConfirm = isSuperAdmin || hasPermission('confirm:deliveries');

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = useState('');
  useEffect(() => {
    if (!projectId && projects && projects.length > 0) setProjectId(projects[0].id);
  }, [projects, projectId]);

  return (
    <Box>
      <PageHeader title="Deliveries" subtitle="Confirm goods received on site against their purchase order." />
      {projectsLoading ? (
        <Skeleton variant="rounded" height={56} sx={{ maxWidth: 320, mb: 3 }} />
      ) : !projects || projects.length === 0 ? (
        <AppEmptyState title="No projects" description="You have no projects with deliveries yet." />
      ) : (
        <>
          <FormControl size="small" sx={{ minWidth: 280, mb: 3 }}>
            <InputLabel id="deliv-project-label">Project</InputLabel>
            <Select labelId="deliv-project-label" label="Project" value={projectId}
              onChange={(e: SelectChangeEvent) => setProjectId(e.target.value)}>
              {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          {projectId && <DeliveriesPanel projectId={projectId} canConfirm={canConfirm} />}
        </>
      )}
    </Box>
  );
}

function DeliveriesPanel({ projectId, canConfirm }: { projectId: string; canConfirm: boolean }) {
  const { data: deliveries, isLoading, isError, refetch } = useDeliveries();
  const { data: users } = useUsers();
  const [confirming, setConfirming] = useState<Delivery | null>(null);

  const userName = useMemo(() => {
    const m = new Map((users ?? []).map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
    return (id?: string | null) => (id ? m.get(id) ?? '—' : '—');
  }, [users]);

  if (isLoading) return <Skeleton variant="rounded" height={240} />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  const rows = (deliveries ?? []).filter((d) => d.projectId === projectId);

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Deliveries</Typography>

      {rows.length === 0 ? (
        <AppEmptyState title="No deliveries" description="No deliveries recorded against this project's purchase orders yet." />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>PO #</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Delivery date</TableCell>
              <TableCell>Received by</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={d.id} hover>
                <TableCell><Typography variant="body2" fontWeight={500}>{d.poNumber ?? '—'}</Typography></TableCell>
                <TableCell><DeliveryStatusChip status={d.status} /></TableCell>
                <TableCell>{d.deliveryDate ? dayjs(d.deliveryDate).format('MMM D, YYYY') : '—'}</TableCell>
                <TableCell>{userName(d.receivedById)}</TableCell>
                <TableCell align="right">
                  {canConfirm && d.status !== 'DELIVERED' && (
                    <AppButton size="small" variant="outlined" startIcon={<CheckCircleIcon />}
                      onClick={() => setConfirming(d)}>
                      Confirm receipt
                    </AppButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmReceiptModal delivery={confirming} onClose={() => setConfirming(null)} />
    </Paper>
  );
}

function ConfirmReceiptModal({ delivery, onClose }: { delivery: Delivery | null; onClose: () => void }) {
  const confirm = useConfirmDelivery();
  const { enqueueSnackbar } = useSnackbar();
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (delivery) { setDate(dayjs().format('YYYY-MM-DD')); setNotes(''); }
  }, [delivery]);

  const submit = async () => {
    if (!delivery) return;
    try {
      await confirm.mutateAsync({ id: delivery.id, payload: { deliveryDate: date || undefined, notes: notes.trim() || undefined } });
      enqueueSnackbar('Delivery confirmed as received.', { variant: 'success' });
      onClose();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message ?? 'Failed to confirm delivery', { variant: 'error' });
    }
  };

  return (
    <AppModal open={!!delivery} onClose={onClose}
      title="Confirm receipt"
      subtitle={delivery?.poNumber ? `Purchase order ${delivery.poNumber}` : undefined}
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={confirm.isPending}>Cancel</AppButton>
          <AppButton variant="contained" loading={confirm.isPending} onClick={submit}>Confirm received</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1} pt={1}>
        <Typography variant="body2" color="text.secondary">
          Marks this delivery as received and records you as the recipient.
        </Typography>
        <TextField label="Date received" type="date" size="small" fullWidth value={date}
          onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField label="Notes (optional)" size="small" fullWidth multiline minRows={2} value={notes}
          onChange={(e) => setNotes(e.target.value)} />
      </Stack>
    </AppModal>
  );
}
