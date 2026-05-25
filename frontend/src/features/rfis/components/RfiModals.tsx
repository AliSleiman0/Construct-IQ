'use client';

import { useEffect, useState } from 'react';
import { Stack, TextField, MenuItem, Alert } from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { useUsers } from '@/features/users/hooks/useUsers';
import {
  RFI_DISCIPLINES,
  RFI_DISCIPLINE_LABEL,
  type CreateRfiPayload,
  type AnswerRfiPayload,
  type Rfi,
  type RfiDiscipline,
} from '@/types/rfi.types';

interface RaiseRfiModalProps {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  /** Project the RFI will belong to (selected on the list page). */
  projectId: string;
  onClose: () => void;
  onSubmit: (payload: CreateRfiPayload) => void;
}

/**
 * Raise (create) an RFI. Thin v1 fields only — subject, question, discipline,
 * respondent ("ball in court"), due-by. No doc links / cost-impact / approval.
 */
export function RaiseRfiModal({ open, isLoading, error, projectId, onClose, onSubmit }: RaiseRfiModalProps) {
  const { data: users } = useUsers();
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [discipline, setDiscipline] = useState<RfiDiscipline>('GENERAL');
  const [respondentId, setRespondentId] = useState('');
  const [dueBy, setDueBy] = useState('');

  useEffect(() => {
    if (!open) {
      setSubject('');
      setQuestion('');
      setDiscipline('GENERAL');
      setRespondentId('');
      setDueBy('');
    }
  }, [open]);

  const submit = () => {
    if (!subject.trim() || !question.trim()) return;
    onSubmit({
      projectId,
      subject: subject.trim(),
      question: question.trim(),
      discipline,
      respondentId: respondentId || undefined,
      dueBy: dueBy || undefined,
    });
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Raise RFI"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>
            Cancel
          </AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={submit} disabled={!subject.trim() || !question.trim()}>
            Raise RFI
          </AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth required inputProps={{ 'aria-label': 'RFI subject' }} />
        <TextField label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} fullWidth required multiline rows={4} />
        <Stack direction="row" spacing={2}>
          <TextField select label="Discipline" value={discipline} onChange={(e) => setDiscipline(e.target.value as RfiDiscipline)} fullWidth>
            {RFI_DISCIPLINES.map((d) => (
              <MenuItem key={d} value={d}>{RFI_DISCIPLINE_LABEL[d]}</MenuItem>
            ))}
          </TextField>
          <TextField label="Response by" type="date" value={dueBy} onChange={(e) => setDueBy(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
        </Stack>
        <TextField select label="Respondent" value={respondentId} onChange={(e) => setRespondentId(e.target.value)} fullWidth>
          <MenuItem value="">Unassigned</MenuItem>
          {(users ?? []).map((u) => (
            <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>
          ))}
        </TextField>
      </Stack>
    </AppModal>
  );
}

interface AnswerRfiModalProps {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  rfi: Rfi | null;
  onClose: () => void;
  onSubmit: (payload: AnswerRfiPayload) => void;
}

/** Manager's formal answer to an RFI (gated to manage:rfis). */
export function AnswerRfiModal({ open, isLoading, error, rfi, onClose, onSubmit }: AnswerRfiModalProps) {
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    if (open) setAnswer(rfi?.answer ?? '');
  }, [open, rfi]);

  const submit = () => {
    if (!answer.trim()) return;
    onSubmit({ answer: answer.trim() });
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Answer RFI"
      subtitle={rfi ? `${rfi.number} · ${rfi.subject}` : undefined}
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>
            Cancel
          </AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={submit} disabled={!answer.trim()}>
            Submit answer
          </AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1} pt={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} fullWidth required multiline rows={5} inputProps={{ 'aria-label': 'RFI answer' }} />
      </Stack>
    </AppModal>
  );
}
