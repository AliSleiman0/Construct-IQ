'use client';

import { useState } from 'react';
import { TextField, MenuItem, Box } from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { useCreateTicket } from '../hooks/useTicketMutations';
import { useSnackbar } from 'notistack';
import type { TicketCategory, TicketPriority } from '@/types/ticket.types';

interface NewTicketModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewTicketModal({ open, onClose }: NewTicketModalProps) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('GENERAL');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const { enqueueSnackbar } = useSnackbar();
  const createTicket = useCreateTicket();

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) return;
    try {
      await createTicket.mutateAsync({ subject, description, category, priority });
      enqueueSnackbar('Ticket created successfully', { variant: 'success' });
      setSubject('');
      setDescription('');
      setCategory('GENERAL');
      setPriority('MEDIUM');
      onClose();
    } catch {
      enqueueSnackbar('Failed to create ticket', { variant: 'error' });
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="New Support Ticket"
      subtitle="Our team typically responds within 24 hours."
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton variant="outlined" onClick={onClose}>Cancel</AppButton>
          <AppButton
            variant="contained"
            onClick={handleSubmit}
            loading={createTicket.isPending}
            disabled={!subject.trim() || !description.trim()}
          >
            Submit
          </AppButton>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <TextField
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          fullWidth
          required
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={4}
          required
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory)}
            fullWidth
          >
            <MenuItem value="GENERAL">General</MenuItem>
            <MenuItem value="BILLING">Billing</MenuItem>
            <MenuItem value="TECHNICAL">Technical</MenuItem>
            <MenuItem value="FEATURE_REQUEST">Feature Request</MenuItem>
          </TextField>
          <TextField
            select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            fullWidth
          >
            <MenuItem value="LOW">Low</MenuItem>
            <MenuItem value="MEDIUM">Medium</MenuItem>
            <MenuItem value="HIGH">High</MenuItem>
            <MenuItem value="URGENT">Urgent</MenuItem>
          </TextField>
        </Box>
      </Box>
    </AppModal>
  );
}
