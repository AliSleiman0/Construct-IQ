'use client';

import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  Stack,
  Button,
  TextField,
  Avatar,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import { useState } from 'react';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { useMockState } from '@/store/mock-state.store';
import { useAuthStore } from '@/store/auth.store';
import { IssueSeverityBadge, IssueStatusBadge } from './IssueSeverityBadge';

export function IssueDetail({ issueId }: { issueId: string }) {
  const { enqueueSnackbar } = useSnackbar();
  const issue = useMockState((s) => s.issues.find((i) => i.id === issueId));
  const comments = useMockState((s) => s.issueComments.filter((c) => c.issueId === issueId));
  const setIssueStatus = useMockState((s) => s.setIssueStatus);
  const addIssueComment = useMockState((s) => s.addIssueComment);
  const user = useAuthStore((s) => s.user);
  const [draft, setDraft] = useState('');

  if (!issue) {
    return (
      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6">Issue not found</Typography>
      </Paper>
    );
  }

  const handleResolve = () => {
    setIssueStatus(issue.id, 'RESOLVED');
    enqueueSnackbar(`Issue ${issue.id} marked resolved.`, { variant: 'success' });
  };

  const handleReopen = () => {
    setIssueStatus(issue.id, 'OPEN');
    enqueueSnackbar(`Issue ${issue.id} reopened.`, { variant: 'info' });
  };

  const handleAddComment = () => {
    const body = draft.trim();
    if (!body || !user) return;
    addIssueComment({
      issueId: issue.id,
      authorId: user.id,
      authorName: `${user.firstName} ${user.lastName}`,
      body,
    });
    setDraft('');
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
      <Stack gap={2.5}>
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
            <Chip label={issue.id} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
            <IssueSeverityBadge severity={issue.severity} />
            <IssueStatusBadge status={issue.status} />
          </Box>
          <Typography variant="h5" fontWeight={700} mb={1}>
            {issue.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Reported by <strong>{issue.reporterName}</strong> · {issue.location} ·{' '}
            {dayjs(issue.createdAt).format('MMM D, YYYY HH:mm')}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body1">{issue.description}</Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="subtitle2" fontWeight={600} mb={2}>
            Comments ({comments.length})
          </Typography>
          {comments.length === 0 && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              No comments yet.
            </Typography>
          )}
          <Stack gap={2}>
            {comments.map((c) => (
              <Box key={c.id} display="flex" gap={1.5}>
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: 'primary.main' }}>
                  {c.authorName
                    .split(' ')
                    .map((s) => s[0])
                    .join('')
                    .slice(0, 2)}
                </Avatar>
                <Box flex={1}>
                  <Box display="flex" alignItems="baseline" gap={1}>
                    <Typography variant="body2" fontWeight={600}>
                      {c.authorName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dayjs(c.createdAt).format('MMM D, HH:mm')}
                    </Typography>
                  </Box>
                  <Typography variant="body2">{c.body}</Typography>
                </Box>
              </Box>
            ))}
          </Stack>
          <Box display="flex" gap={1} mt={2.5}>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              placeholder="Add a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              disabled={!draft.trim()}
              onClick={handleAddComment}
              sx={{ alignSelf: 'flex-start' }}
            >
              Send
            </Button>
          </Box>
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
            <KV label="Severity" value={<IssueSeverityBadge severity={issue.severity} />} />
            <KV label="Status" value={<IssueStatusBadge status={issue.status} />} />
            <KV label="Trade" value={issue.trade} />
            <KV label="Location" value={issue.location} />
            <KV label="Reporter" value={issue.reporterName} />
            <KV label="Assignee" value={issue.assigneeName ?? 'Unassigned'} />
            <KV label="Created" value={dayjs(issue.createdAt).format('MMM D, YYYY HH:mm')} />
            {issue.resolvedAt && (
              <KV label="Resolved" value={dayjs(issue.resolvedAt).format('MMM D, YYYY HH:mm')} />
            )}
          </Stack>

          <Stack gap={1} mt={2}>
            {issue.status !== 'RESOLVED' ? (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                fullWidth
                onClick={handleResolve}
              >
                Mark resolved
              </Button>
            ) : (
              <Button variant="outlined" fullWidth onClick={handleReopen}>
                Reopen
              </Button>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </Typography>
      <Box mt={0.25}>
        {typeof value === 'string' ? (
          <Typography variant="body2" fontWeight={500}>
            {value}
          </Typography>
        ) : (
          value
        )}
      </Box>
    </Box>
  );
}
