'use client';

import { Box, Paper, Typography, Chip, Divider, Stack, Button } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useReport } from '@/features/reports/hooks/useReports';
import { useSummarizeReport } from '@/features/reports/hooks/useReportMutations';
import { useAiFeatures } from '@/features/org-features/hooks/useAiFeatures';
import { AI_FEATURE_KEYS } from '@/constants/ai-feature-keys';
import type { UserRef } from '@/types/report.types';

function authorName(u?: UserRef | null): string {
  if (!u) return 'Unknown';
  return `${u.firstName} ${u.lastName}`.trim() || 'Unknown';
}

export function ReportDetailView({ reportId }: { reportId: string }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: report, isLoading, isError, refetch } = useReport(reportId);
  const { hasAiFeature } = useAiFeatures();
  const summarize = useSummarizeReport();

  if (isLoading) return <AppLoader />;
  if (isError) return <AppErrorState onRetry={refetch} />;
  if (!report) {
    return (
      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6">Report not found</Typography>
      </Paper>
    );
  }

  const manpower = report.manpowerEntries ?? [];
  const equipment = report.equipmentEntries ?? [];
  const materials = report.materialEntries ?? [];
  const totalHands = manpower.reduce((s, m) => s + (m.count ?? 0), 0);
  const canSummarize = hasAiFeature(AI_FEATURE_KEYS.AI_REPORT_SUMMARY);

  const handleSummarize = async () => {
    try {
      await summarize.mutateAsync(report.id);
      enqueueSnackbar('AI summary generated.', { variant: 'success' });
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message ?? 'Failed to generate summary.', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
      <Stack gap={2.5}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1.5} flexWrap="wrap">
            {report.project?.name && (
              <Chip label={report.project.name} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
            <Typography variant="caption" color="text.secondary">
              {dayjs(report.reportDate).format('dddd, MMMM D, YYYY')}
            </Typography>
          </Box>
          <Typography variant="h5" fontWeight={700} mb={0.5}>
            Daily report — {authorName(report.createdBy)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Filed {dayjs(report.createdAt).format('MMM D, HH:mm')}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Section title="Work completed">
            <Typography variant="body1">{report.workCompleted || '—'}</Typography>
          </Section>
          {report.blockers && (
            <Section title="Blockers">
              <Typography variant="body1" color="warning.main">
                {report.blockers}
              </Typography>
            </Section>
          )}
          {report.notes && (
            <Section title="Notes">
              <Typography variant="body1">{report.notes}</Typography>
            </Section>
          )}
        </Paper>

        {/* AI summary */}
        {(canSummarize || report.aiSummary) && (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Typography variant="subtitle2" fontWeight={600}>
                AI summary
              </Typography>
              {canSummarize && (
                <Button
                  size="small"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleSummarize}
                  disabled={summarize.isPending}
                >
                  {report.aiSummary ? 'Regenerate' : 'Generate AI summary'}
                </Button>
              )}
            </Box>
            {report.aiSummary ? (
              <Typography variant="body2">{report.aiSummary}</Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No summary yet. Generate one from this report&apos;s contents.
              </Typography>
            )}
          </Paper>
        )}

        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            Manpower ({totalHands} on site)
          </Typography>
          {manpower.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No manpower logged.
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' } }}>
              {manpower.map((m, i) => (
                <Box key={i} sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                    {m.trade}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {m.count}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            Equipment ({equipment.length})
          </Typography>
          {equipment.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No equipment on site.
            </Typography>
          ) : (
            <Stack gap={1}>
              {equipment.map((e, i) => (
                <Box key={i} display="flex" justifyContent="space-between">
                  <Typography variant="body2">{e.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {e.hours} hrs
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        {materials.length > 0 && (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
              Materials ({materials.length})
            </Typography>
            <Stack gap={1}>
              {materials.map((m, i) => (
                <Box key={i} display="flex" justifyContent="space-between">
                  <Typography variant="body2">{m.material}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {m.quantity} {m.unit}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}
      </Stack>

      <Stack gap={2}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            Conditions
          </Typography>
          <Stack gap={1.5}>
            <KV label="Weather" value={report.weather || '—'} />
            <KV
              label="High / Low"
              value={
                report.highTempC != null || report.lowTempC != null
                  ? `${report.highTempC ?? '—'}°C / ${report.lowTempC ?? '—'}°C`
                  : '—'
              }
            />
            <KV label="Project" value={report.project?.name ?? '—'} />
            <KV label="Author" value={authorName(report.createdBy)} />
            <KV label="Date" value={dayjs(report.reportDate).format('MMM D, YYYY')} />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box mb={2}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }} mb={0.5} display="block">
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  );
}
