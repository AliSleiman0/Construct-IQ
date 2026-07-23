'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Stack,
} from '@mui/material';
import { useState } from 'react';
import { useCreateTicket } from '../hooks/useTickets';
import type { TicketPriority } from '@/mocks/tickets.mock';

const PRIORITIES: TicketPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

interface NewTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (ticketId: string) => void;
}

export function NewTicketModal({ open, onClose, onCreated }: NewTicketModalProps) {
  // POST /tickets is gated on `create:tickets`, which CLIENT holds — raising a
  // case is a customer action, not a triage one. The reporter is taken from the
  // JWT server-side, so nothing about the author is sent from here.
  const createTicket = useCreateTicket();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');

  const reset = () => {
    setTitle('');
    setBody('');
    setPriority('NORMAL');
  };

  const handleSubmit = () => {
    if (!title.trim() || !body.trim() || createTicket.isPending) return;
    createTicket.mutate(
      { title: title.trim(), body: body.trim(), priority },
      {
        onSuccess: (created) => {
          reset();
          onClose();
          if (created?.id) onCreated?.(created.id);
        },
      },
    );
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>New ticket</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={1}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            fullWidth
            placeholder="Short, descriptive summary"
          />
          <TextField
            label="Description"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            placeholder="What happened? Steps to reproduce, expected vs. actual, screenshots…"
          />
          <TextField
            select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            fullWidth
          >
            {PRIORITIES.map((p) => (
              <MenuItem key={p} value={p}>
                {p.toLowerCase()}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!title.trim() || !body.trim() || createTicket.isPending}
        >
          Create ticket
        </Button>
      </DialogActions>
    </Dialog>
  );
}
