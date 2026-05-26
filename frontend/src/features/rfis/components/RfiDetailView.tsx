'use client';

import { useState } from 'react';
import { Box, Paper, Typography, Chip, Stack, Button } from '@mui/material';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useRfi, useAnswerRfi, useUpdateRfi } from '@/features/rfis/hooks/useRfis';
import { AnswerRfiModal } from '@/features/rfis/components/RfiModals';
import { useAuthStore } from '@/store/auth.store';
import { RFI_STATUS_LABEL, RFI_DISCIPLINE_LABEL, type RfiStatus } from '@/types/rfi.types';

const STATUS_COLOR: Record<RfiStatus, 'default' | 'success' | 'warning'> = {
  OPEN: 'warning',
  ANSWERED: 'success',
  CLOSED: 'default',
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

export function RfiDetailView({ rfiId }: { rfiId: string }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: rfi, isLoading, isError, refetch } = useRfi(rfiId);
  const answerRfi = useAnswerRfi();
  const updateRfi = useUpdateRfi();

  const isSuperAdmin = useAuthStore((s) => s.user?.isSuperAdmin ?? false);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canAnswer = isSuperAdmin || hasPermission('manage:rfis');
  const canUpdate = isSuperAdmin || hasPermission('update:rfis');

  const [answerOpen, setAnswerOpen] = useState(false);

  if (isLoading) return <AppLoader />;
  if (isError || !rfi) return <AppErrorState onRetry={refetch} />;

  const setStatus = (status: RfiStatus) =>
    updateRfi.mutate(
      { id: rfi.id, payload: { status } },
      {
        onSuccess: () => enqueueSnackbar('RFI updated.', { variant: 'success' }),
        onError: () => enqueueSnackbar('Could not update the RFI.', { variant: 'error' }),
      },
    );

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 2, alignItems: 'start' }}>
      <Stack gap={2}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
            <Chip label={rfi.number} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
            <Chip label={RFI_DISCIPLINE_LABEL[rfi.discipline]} size="small" variant="outlined" />
            <Chip label={RFI_STATUS_LABEL[rfi.status]} size="small" color={STATUS_COLOR[rfi.status]} sx={{ fontWeight: 600 }} />
          </Box>
          <Typography variant="h6" fontWeight={700}>{rfi.subject}</Typography>
          <Typography variant="body2" color="text.secondary" mt={1} sx={{ whiteSpace: 'pre-wrap' }}>{rfi.question}</Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Typography variant="subtitle2" fontWeight={600}>Answer</Typography>
            {canAnswer && rfi.status !== 'ANSWERED' && (
              <Button size="small" startIcon={<QuestionAnswerIcon />} onClick={() => setAnswerOpen(true)}>
                Answer RFI
              </Button>
            )}
          </Box>
          {rfi.answer ? (
            <>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{rfi.answer}</Typography>
              <Typography variant="caption" color="text.secondary" mt={1} display="block">
                {rfi.answeredBy ? `${rfi.answeredBy.firstName} ${rfi.answeredBy.lastName}` : 'Answered'}
                {rfi.answeredAt ? ` · ${dayjs(rfi.answeredAt).format('MMM D, YYYY HH:mm')}` : ''}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">Awaiting a response.</Typography>
          )}
        </Paper>
      </Stack>

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1.5}>Properties</Typography>
        <Stack gap={1.5}>
          <KV label="Status" value={<Chip label={RFI_STATUS_LABEL[rfi.status]} size="small" color={STATUS_COLOR[rfi.status]} sx={{ fontWeight: 600 }} />} />
          <KV label="Discipline" value={RFI_DISCIPLINE_LABEL[rfi.discipline]} />
          {rfi.project?.name && <KV label="Project" value={rfi.project.name} />}
          <KV label="Respondent" value={rfi.respondent ? `${rfi.respondent.firstName} ${rfi.respondent.lastName}` : 'Unassigned'} />
          <KV label="Response by" value={rfi.dueBy ? dayjs(rfi.dueBy).format('MMM D, YYYY') : '—'} />
          {rfi.createdBy && <KV label="Raised by" value={`${rfi.createdBy.firstName} ${rfi.createdBy.lastName}`} />}
          <KV label="Raised" value={dayjs(rfi.createdAt).format('MMM D, YYYY HH:mm')} />
        </Stack>
        {canUpdate && rfi.status !== 'CLOSED' && (
          <Button variant="outlined" startIcon={<CheckCircleIcon />} fullWidth sx={{ mt: 2 }} disabled={updateRfi.isPending} onClick={() => setStatus('CLOSED')}>
            Close RFI
          </Button>
        )}
        {canUpdate && rfi.status === 'CLOSED' && (
          <Button variant="outlined" startIcon={<ReplayIcon />} fullWidth sx={{ mt: 2 }} disabled={updateRfi.isPending} onClick={() => setStatus('OPEN')}>
            Reopen RFI
          </Button>
        )}
      </Paper>

      <AnswerRfiModal
        open={answerOpen}
        isLoading={answerRfi.isPending}
        error={answerRfi.isError ? 'Could not submit the answer. Try again.' : null}
        rfi={rfi}
        onClose={() => setAnswerOpen(false)}
        onSubmit={(payload) =>
          answerRfi.mutate(
            { id: rfi.id, payload },
            {
              onSuccess: () => {
                setAnswerOpen(false);
                enqueueSnackbar('RFI answered.', { variant: 'success' });
              },
              onError: () => enqueueSnackbar('Could not submit the answer.', { variant: 'error' }),
            },
          )
        }
      />
    </Box>
  );
}
