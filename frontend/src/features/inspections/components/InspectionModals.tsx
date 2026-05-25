'use client';

import { useEffect, useState } from 'react';
import { Stack, TextField, MenuItem, Alert } from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { useUsers } from '@/features/users/hooks/useUsers';
import {
  INSPECTION_TYPES,
  INSPECTION_STATUSES,
  INSPECTION_STATUS_LABEL,
  type CreateInspectionPayload,
  type UpdateInspectionPayload,
  type Inspection,
  type InspectionType,
  type InspectionStatus,
} from '@/types/inspection.types';

interface ScheduleInspectionModalProps {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  /** Project the inspection will belong to (selected on the list page). */
  projectId: string;
  onClose: () => void;
  onSubmit: (payload: CreateInspectionPayload) => void;
}

const TYPE_LABEL: Record<InspectionType, string> = {
  SAFETY: 'Safety',
  QUALITY: 'Quality',
  STRUCTURAL: 'Structural',
  ELECTRICAL: 'Electrical',
  MECHANICAL: 'Mechanical',
  PLUMBING: 'Plumbing',
  GENERAL: 'General',
};

/**
 * Schedule (create) an inspection. Thin v1 fields only — title, type, date,
 * location, notes. No checklist / photos / sign-off (SME-gated, deferred).
 */
export function ScheduleInspectionModal({
  open,
  isLoading,
  error,
  projectId,
  onClose,
  onSubmit,
}: ScheduleInspectionModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<InspectionType>('GENERAL');
  const [scheduledFor, setScheduledFor] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) {
      setTitle('');
      setType('GENERAL');
      setScheduledFor('');
      setLocation('');
      setNotes('');
    }
  }, [open]);

  const submit = () => {
    if (!title.trim()) return;
    onSubmit({
      projectId,
      title: title.trim(),
      type,
      scheduledFor: scheduledFor || undefined,
      location: location || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Schedule Inspection"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>
            Cancel
          </AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={submit} disabled={!title.trim()}>
            Schedule
          </AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth required inputProps={{ 'aria-label': 'Inspection title' }} />
        <Stack direction="row" spacing={2}>
          <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value as InspectionType)} fullWidth>
            {INSPECTION_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {TYPE_LABEL[t]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Scheduled for"
            type="date"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
        <TextField label="Location" value={location} onChange={(e) => setLocation(e.target.value)} fullWidth />
        <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={3} />
      </Stack>
    </AppModal>
  );
}

interface EditInspectionModalProps {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  inspection: Inspection | null;
  onClose: () => void;
  onSubmit: (payload: UpdateInspectionPayload) => void;
}

/** Edit an inspection — reschedule, reassign inspector, amend notes, set outcome. */
export function EditInspectionModal({
  open,
  isLoading,
  error,
  inspection,
  onClose,
  onSubmit,
}: EditInspectionModalProps) {
  const { data: users } = useUsers();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<InspectionType>('GENERAL');
  const [status, setStatus] = useState<InspectionStatus>('SCHEDULED');
  const [scheduledFor, setScheduledFor] = useState('');
  const [inspectorId, setInspectorId] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Prefill from the inspection each time the modal opens.
  useEffect(() => {
    if (open && inspection) {
      setTitle(inspection.title ?? '');
      setType(inspection.type);
      setStatus(inspection.status);
      setScheduledFor(inspection.scheduledFor ? inspection.scheduledFor.slice(0, 10) : '');
      setInspectorId(inspection.inspectorId ?? '');
      setLocation(inspection.location ?? '');
      setNotes(inspection.notes ?? '');
    }
  }, [open, inspection]);

  const submit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      type,
      status,
      scheduledFor: scheduledFor || undefined,
      inspectorId: inspectorId || undefined,
      location: location || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Edit Inspection"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>
            Cancel
          </AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={submit} disabled={!title.trim()}>
            Save
          </AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth required inputProps={{ 'aria-label': 'Inspection title' }} />
        <Stack direction="row" spacing={2}>
          <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value as InspectionType)} fullWidth>
            {INSPECTION_TYPES.map((t) => (
              <MenuItem key={t} value={t}>{TYPE_LABEL[t]}</MenuItem>
            ))}
          </TextField>
          <TextField select label="Outcome" value={status} onChange={(e) => setStatus(e.target.value as InspectionStatus)} fullWidth>
            {INSPECTION_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{INSPECTION_STATUS_LABEL[s]}</MenuItem>
            ))}
          </TextField>
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Scheduled for"
            type="date"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField select label="Inspector" value={inspectorId} onChange={(e) => setInspectorId(e.target.value)} fullWidth>
            <MenuItem value="">Unassigned</MenuItem>
            {(users ?? []).map((u) => (
              <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>
            ))}
          </TextField>
        </Stack>
        <TextField label="Location" value={location} onChange={(e) => setLocation(e.target.value)} fullWidth />
        <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={3} />
      </Stack>
    </AppModal>
  );
}
