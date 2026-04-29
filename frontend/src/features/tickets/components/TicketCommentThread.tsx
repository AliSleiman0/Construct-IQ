'use client';

import { Box, Avatar, Typography, TextField, Button, Stack, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useMockState } from '@/store/mock-state.store';
import { useAuthStore } from '@/store/auth.store';
import type { CommentAuthorKind } from '@/mocks/tickets.mock';

interface TicketCommentThreadProps {
  ticketId: string;
  /** What kind of author the current viewer is. Determines styling. */
  viewerKind: CommentAuthorKind;
}

export function TicketCommentThread({ ticketId, viewerKind }: TicketCommentThreadProps) {
  const comments = useMockState((s) => s.comments.filter((c) => c.ticketId === ticketId));
  const addComment = useMockState((s) => s.addComment);
  const user = useAuthStore((s) => s.user);
  const [draft, setDraft] = useState('');

  const handleSubmit = () => {
    const body = draft.trim();
    if (!body || !user) return;
    addComment({
      ticketId,
      authorId: user.id,
      authorName: `${user.firstName} ${user.lastName}`,
      authorKind: viewerKind,
      body,
    });
    setDraft('');
  };

  return (
    <Stack gap={2}>
      <Typography variant="subtitle2" fontWeight={600}>
        Comments ({comments.length})
      </Typography>

      {comments.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No comments yet.
        </Typography>
      )}

      {comments.map((c) => {
        const isAgent = c.authorKind === 'agent';
        return (
          <Box key={c.id} display="flex" gap={1.5}>
            <Avatar
              sx={{
                bgcolor: isAgent ? 'primary.main' : 'grey.500',
                width: 32,
                height: 32,
                fontSize: '0.8rem',
              }}
            >
              {c.authorName
                .split(' ')
                .map((s) => s[0])
                .join('')
                .slice(0, 2)}
            </Avatar>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: isAgent ? 'rgba(25,118,210,0.04)' : 'background.paper',
              }}
            >
              <Box display="flex" alignItems="baseline" gap={1} mb={0.5}>
                <Typography variant="body2" fontWeight={600}>
                  {c.authorName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isAgent ? 'Support · ' : ''}
                  {dayjs(c.createdAt).format('MMM D, HH:mm')}
                </Typography>
              </Box>
              <Typography variant="body2">{c.body}</Typography>
            </Paper>
          </Box>
        );
      })}

      <Box display="flex" gap={1} mt={1}>
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={2}
          placeholder={
            viewerKind === 'agent' ? 'Reply as support…' : 'Add a comment…'
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          disabled={!draft.trim()}
          onClick={handleSubmit}
          sx={{ alignSelf: 'flex-start' }}
        >
          Send
        </Button>
      </Box>
    </Stack>
  );
}
