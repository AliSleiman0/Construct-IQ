'use client';

import {
  Box, Button, Paper, Typography, Stack, Chip, TextField,
  MenuItem, Divider, CircularProgress, Avatar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  useTicket,
  useUpdateTicket,
  useAssignTicket,
  useAddTicketComment,
} from '@/features/tickets/hooks/useTickets';

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  OPEN: 'warning', IN_PROGRESS: 'info', RESOLVED: 'success', CLOSED: 'default',
};
const PRIORITY_COLOR: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  LOW: 'default', MEDIUM: 'info', HIGH: 'warning', URGENT: 'error',
};
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function SuperAdminTicketDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  const { data: ticket, isLoading } = useTicket(id);
  const updateTicket = useUpdateTicket(id);
  const assignTicket = useAssignTicket(id);
  const addComment = useAddTicketComment(id);

  const [comment, setComment] = useState('');

  const handleSendComment = async () => {
    if (!comment.trim()) return;
    await addComment.mutateAsync({ body: comment.trim(), kind: 'reply' });
    setComment('');
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box>
        <PageHeader title="Ticket not found"
          breadcrumbs={[{ label: 'Tickets', href: '/super-admin/tickets' }, { label: id }]} />
        <Typography color="text.secondary">This ticket does not exist or was deleted.</Typography>
      </Box>
    );
  }

  const t = ticket as any;

  return (
    <Box>
      <PageHeader
        title={t.title}
        breadcrumbs={[{ label: 'Tickets', href: '/super-admin/tickets' }, { label: `#${id.slice(-6)}` }]}
        actions={
          <Button component={Link} href="/super-admin/tickets"
            startIcon={<ArrowBackIcon />} variant="text">
            Back to queue
          </Button>
        }
      />

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
        {/* Left — body + comments */}
        <Stack gap={2}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3 }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{t.body}</Typography>
            <Stack direction="row" gap={1} mt={2} flexWrap="wrap">
              <Chip label={t.status} color={STATUS_COLOR[t.status] ?? 'default'} size="small" sx={{ fontWeight: 600 }} />
              <Chip label={t.priority} color={PRIORITY_COLOR[t.priority] ?? 'default'} size="small" sx={{ fontWeight: 600 }} />
            </Stack>
          </Paper>

          {/* Comments */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={2}>
              Comments ({(t.comments ?? []).length})
            </Typography>
            <Stack gap={2} divider={<Divider />}>
              {(t.comments ?? []).map((c: any, i: number) => (
                <Box key={c._id ?? i} display="flex" gap={1.5}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                    {(c.authorId ?? '?')[0].toUpperCase()}
                  </Avatar>
                  <Box flex={1}>
                    <Stack direction="row" gap={1} alignItems="center" mb={0.5}>
                      <Typography variant="caption" fontWeight={600}>{c.authorId}</Typography>
                      {c.kind === 'internal' && (
                        <Chip label="internal" size="small" variant="outlined"
                          sx={{ fontSize: '0.65rem', height: 18 }} />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(c.createdAt).format('DD MMM YYYY HH:mm')}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.body}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Stack direction="row" gap={1.5}>
              <TextField
                multiline minRows={2}
                fullWidth
                placeholder="Add a reply…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleSendComment}
                disabled={!comment.trim() || addComment.isPending}
                sx={{ alignSelf: 'flex-end' }}
                startIcon={<SendIcon />}
              >
                Send
              </Button>
            </Stack>
          </Paper>
        </Stack>

        {/* Right — properties */}
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3, alignSelf: 'start' }}>
          <Typography variant="subtitle2" fontWeight={700} mb={2}>Properties</Typography>
          <Stack gap={2}>
            <TextField
              select label="Status" value={t.status ?? 'OPEN'} size="small"
              onChange={(e) => updateTicket.mutate({ status: e.target.value })}
              disabled={updateTicket.isPending}
            >
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>

            <TextField
              select label="Priority" value={t.priority ?? 'MEDIUM'} size="small"
              onChange={(e) => updateTicket.mutate({ priority: e.target.value })}
              disabled={updateTicket.isPending}
            >
              {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>

            <TextField
              label="Assignee ID"
              defaultValue={t.assigneeId ?? ''}
              size="small"
              placeholder="Paste user ID to assign"
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val && val !== t.assigneeId) {
                  assignTicket.mutate(val);
                }
              }}
            />

            <Divider />
            <Stack gap={0.5}>
              <Typography variant="caption" color="text.secondary">Reporter</Typography>
              <Typography variant="body2" fontFamily="monospace">{t.reporterId ?? '—'}</Typography>
            </Stack>
            <Stack gap={0.5}>
              <Typography variant="caption" color="text.secondary">Created</Typography>
              <Typography variant="body2">{dayjs(t.createdAt).format('DD MMM YYYY HH:mm')}</Typography>
            </Stack>
            {t.resolvedAt && (
              <Stack gap={0.5}>
                <Typography variant="caption" color="text.secondary">Resolved</Typography>
                <Typography variant="body2">{dayjs(t.resolvedAt).format('DD MMM YYYY HH:mm')}</Typography>
              </Stack>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
