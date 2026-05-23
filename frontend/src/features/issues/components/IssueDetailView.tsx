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
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useIssue } from '@/features/issues/hooks/useIssues';
import { useUpdateIssue, useAddIssueComment } from '@/features/issues/hooks/useIssueMutations';
import type { UserRef } from '@/types/issue.types';
import { IssueSeverityBadge, IssueStatusBadge } from './IssueBadges';

function userName(u?: UserRef | null): string {
  if (!u) return 'Unknown';
  return `${u.firstName} ${u.lastName}`.trim() || 'Unknown';
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function IssueDetailView({ issueId }: { issueId: string }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: issue, isLoading, isError, refetch } = useIssue(issueId);
  const updateIssue = useUpdateIssue();
  const addComment = useAddIssueComment();
  const [draft, setDraft] = useState('');

  if (isLoading) return <AppLoader />;
  if (isError) return <AppErrorState onRetry={refetch} />;
  if (!issue) {
    return (
      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6">Issue not found</Typography>
      </Paper>
    );
  }

  const handleResolve = async () => {
    await updateIssue.mutateAsync({
      id: issue.id,
      payload: { status: 'RESOLVED', resolvedAt: new Date().toISOString() },
    });
    enqueueSnackbar('Issue marked resolved.', { variant: 'success' });
  };

  const handleReopen = async () => {
    await updateIssue.mutateAsync({ id: issue.id, payload: { status: 'OPEN', resolvedAt: null } });
    enqueueSnackbar('Issue reopened.', { variant: 'info' });
  };

  const handleAddComment = async () => {
    const body = draft.trim();
    if (!body) return;
    await addComment.mutateAsync({ id: issue.id, body });
    setDraft('');
  };

  const comments = issue.comments ?? [];

  return (
    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
      <Stack gap={2.5}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1.5} flexWrap="wrap">
            {issue.project?.name && (
              <Chip label={issue.project.name} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
            <IssueSeverityBadge severity={issue.severity} />
            <IssueStatusBadge status={issue.status} />
          </Box>
          <Typography variant="h5" fontWeight={700} mb={1}>
            {issue.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Reported by <strong>{userName(issue.createdBy)}</strong>
            {issue.location ? ` · ${issue.location}` : ''} · {dayjs(issue.createdAt).format('MMM D, YYYY HH:mm')}
          </Typography>
          {issue.description && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1">{issue.description}</Typography>
            </>
          )}
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600} mb={2}>
            Comments ({comments.length})
          </Typography>
          {comments.length === 0 && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              No comments yet.
            </Typography>
          )}
          <Stack gap={2}>
            {comments.map((c) => {
              const name = userName(c.author);
              return (
                <Box key={c.id} display="flex" gap={1.5}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: 'primary.main' }}>
                    {initials(name)}
                  </Avatar>
                  <Box flex={1}>
                    <Box display="flex" alignItems="baseline" gap={1}>
                      <Typography variant="body2" fontWeight={600}>
                        {name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(c.createdAt).format('MMM D, HH:mm')}
                      </Typography>
                    </Box>
                    <Typography variant="body2">{c.body}</Typography>
                  </Box>
                </Box>
              );
            })}
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
              disabled={!draft.trim() || addComment.isPending}
              onClick={handleAddComment}
              sx={{ alignSelf: 'flex-start' }}
            >
              Send
            </Button>
          </Box>
        </Paper>
      </Stack>

      <Stack gap={2}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            Properties
          </Typography>
          <Stack gap={1.5}>
            <KV label="Severity" value={<IssueSeverityBadge severity={issue.severity} />} />
            <KV label="Status" value={<IssueStatusBadge status={issue.status} />} />
            {issue.trade && <KV label="Trade" value={issue.trade} />}
            {issue.location && <KV label="Location" value={issue.location} />}
            <KV label="Reporter" value={userName(issue.createdBy)} />
            <KV label="Assignee" value={issue.assignedTo ? userName(issue.assignedTo) : 'Unassigned'} />
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
                disabled={updateIssue.isPending}
                onClick={handleResolve}
              >
                Mark resolved
              </Button>
            ) : (
              <Button variant="outlined" fullWidth disabled={updateIssue.isPending} onClick={handleReopen}>
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
