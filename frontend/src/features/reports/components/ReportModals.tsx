'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Stack, Alert } from '@mui/material';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { FormTextField } from '@/components/form/FormTextField';
import type { DailyReport } from '@/types/report.types';

const reportSchema = z.object({
  reportDate: z.string().min(1, 'Report date is required'),
  weather: z.string().optional(),
  workCompleted: z.string().optional(),
  blockers: z.string().optional(),
  notes: z.string().optional(),
});
type ReportFormValues = z.infer<typeof reportSchema>;

interface CreateReportModalProps {
  open: boolean;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: ReportFormValues) => void;
}

export function CreateReportModal({ open, isLoading, error, onClose, onSubmit }: CreateReportModalProps) {
  const { control, handleSubmit, reset } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reportDate: new Date().toISOString().slice(0, 10), weather: '', workCompleted: '', blockers: '', notes: '' },
  });
  useEffect(() => { if (!open) reset(); }, [open, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="New Daily Report"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>Submit Report</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="reportDate" control={control} label="Report Date" type="date" fullWidth required InputLabelProps={{ shrink: true }} />
        <FormTextField name="weather" control={control} label="Weather Conditions" fullWidth />
        <FormTextField name="workCompleted" control={control} label="Work Completed" fullWidth multiline rows={3} />
        <FormTextField name="blockers" control={control} label="Blockers / Issues" fullWidth multiline rows={2} />
        <FormTextField name="notes" control={control} label="Additional Notes" fullWidth multiline rows={2} />
      </Stack>
    </AppModal>
  );
}

interface EditReportModalProps {
  open: boolean;
  report: DailyReport | null;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: ReportFormValues) => void;
}

export function EditReportModal({ open, report, isLoading, error, onClose, onSubmit }: EditReportModalProps) {
  const { control, handleSubmit, reset } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reportDate: '', weather: '', workCompleted: '', blockers: '', notes: '' },
  });
  useEffect(() => {
    if (report) reset({
      reportDate: report.reportDate.slice(0, 10),
      weather: report.weather ?? '',
      workCompleted: report.workCompleted ?? '',
      blockers: report.blockers ?? '',
      notes: report.notes ?? '',
    });
  }, [report, reset]);

  return (
    <AppModal open={open} onClose={onClose} title="Edit Daily Report"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>Save Changes</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="reportDate" control={control} label="Report Date" type="date" fullWidth required InputLabelProps={{ shrink: true }} />
        <FormTextField name="weather" control={control} label="Weather Conditions" fullWidth />
        <FormTextField name="workCompleted" control={control} label="Work Completed" fullWidth multiline rows={3} />
        <FormTextField name="blockers" control={control} label="Blockers / Issues" fullWidth multiline rows={2} />
        <FormTextField name="notes" control={control} label="Additional Notes" fullWidth multiline rows={2} />
      </Stack>
    </AppModal>
  );
}
