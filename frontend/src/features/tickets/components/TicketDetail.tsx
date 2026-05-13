'use client';

import {
  Box,
  Paper,
  Typography,
  Stack,
  Divider,
  TextField,
  MenuItem,
  Chip,
  Button,
} from '@mui/material';
import dayjs from 'dayjs';
import { useMockState } from '@/store/mock-state.store';
import type { CommentAuthorKind, TicketStatus } from '@/mocks/tickets.mock';
import { TicketPriorityBadge, TicketStatusBadge } from './TicketStatusBadge';
import { TicketCommentThread } from './TicketCommentThread';
import { mockDemoUsers } from '@/mocks/users.mock';

const STATUS_OPTIONS: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'];

interface TicketDetailProps {
  ticketId: string;
  /** Full = support agents/super admin (status + assign). Read = customers (no edit). */
  mode: 'full' | 'read';
  viewerKind: CommentAuthorKind;
}

export function TicketDetail({ ticketId, mode, viewerKind }: TicketDetailProps) {
  const ticket = useMockState((s) => s.tickets.find((t) => t.id === ticketId));
  const setTicketStatus = useMockState((s) => s.setTicketStatus);
  const assignTicket = useMockState((s) => s.assignTicket);

  if (!ticket) {
    return (
      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6">Ticket not found</Typography>
      </Paper>
    );
  }

  const supportAgents = mockDemoUsers.filter((u) => u.roles.includes('SUPPORT_AGENT'));

  return (
    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
      <Stack gap={2.5}>
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
            <Chip
              label={ticket.id}
              size="small"
              variant="outlined"
              sx={{ fontFamily: 'monospace', fontWeight: 600 }}
            />
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
          </Box>
          <Typography variant="h5" fontWeight={700} mb={1}>
            {ticket.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Reported by <strong>{ticket.reporterName}</strong> · {ticket.orgName} ·{' '}
            {dayjs(ticket.createdAt).format('MMM D, YYYY HH:mm')}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body1">{ticket.body}</Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <TicketCommentThread ticketId={ticket.id} viewerKind={viewerKind} />
        </Paper>
      </Stack>

      <Stack gap={2}>
        <Paper
          elevation={0}
          sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            Properties
          </Typography>
          <Stack gap={1.5}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                Status
              </Typography>
              {mode === 'full' ? (
                <TextField
                  size="small"
                  select
                  fullWidth
                  value={ticket.status}
                  onChange={(e) => setTicketStatus(ticket.id, e.target.value as TicketStatus)}
                  sx={{ mt: 0.5 }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s.replace('_', ' ').toLowerCase()}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Box mt={0.5}>
                  <TicketStatusBadge status={ticket.status} />
                </Box>
              )}
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                Assignee
              </Typography>
              {mode === 'full' ? (
                <TextField
                  size="small"
                  select
                  fullWidth
                  value={ticket.assigneeId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return assignTicket(ticket.id, null);
                    const u = supportAgents.find((s) => s.id === id);
                    if (u) assignTicket(ticket.id, { id: u.id, name: `${u.firstName} ${u.lastName}` });
                  }}
                  sx={{ mt: 0.5 }}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {supportAgents.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Typography variant="body2" mt={0.5}>
                  {ticket.assigneeName ?? 'Unassigned'}
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                Organization
              </Typography>
              <Typography variant="body2" mt={0.5}>{ticket.orgName}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                Created
              </Typography>
              <Typography variant="body2" mt={0.5}>
                {dayjs(ticket.createdAt).format('MMM D, YYYY HH:mm')}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                Last update
              </Typography>
              <Typography variant="body2" mt={0.5}>
                {dayjs(ticket.updatedAt).format('MMM D, YYYY HH:mm')}
              </Typography>
            </Box>

            {mode === 'full' && ticket.status !== 'RESOLVED' && (
              <Button
                variant="outlined"
                color="success"
                onClick={() => setTicketStatus(ticket.id, 'RESOLVED')}
                sx={{ mt: 1 }}
              >
                Mark resolved
              </Button>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
