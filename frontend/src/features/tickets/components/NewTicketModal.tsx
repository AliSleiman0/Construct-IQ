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
import { useMockState } from '@/store/mock-state.store';
import { useAuthStore } from '@/store/auth.store';
import type { TicketPriority } from '@/mocks/tickets.mock';

const PRIORITIES: TicketPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

interface NewTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (ticketId: string) => void;
}

export function NewTicketModal({ open, onClose, onCreated }: NewTicketModalProps) {
  const user = useAuthStore((s) => s.user);
  const createTicket = useMockState((s) => s.createTicket);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');

  const reset = () => {
    setTitle('');
    setBody('');
    setPriority('NORMAL');
  };

  const handleSubmit = () => {
    if (!user || !title.trim() || !body.trim()) return;
    const t = createTicket({
      title: title.trim(),
      body: body.trim(),
      priority,
      orgId: user.organization.id,
      orgName: user.organization.name,
      reporterId: user.id,
      reporterName: `${user.firstName} ${user.lastName}`,
    });
    reset();
    onClose();
    onCreated?.(t.id);
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
          disabled={!title.trim() || !body.trim()}
        >
          Create ticket
        </Button>
      </DialogActions>
    </Dialog>
  );
}
