'use client';

import { Box, Paper, Typography, Chip, Divider, Stack } from '@mui/material';
import dayjs from 'dayjs';
import { useMockState } from '@/store/mock-state.store';
import type { Weather } from '@/mocks/daily-reports.mock';

const WEATHER_LABEL: Record<Weather, string> = {
  SUNNY: 'Sunny',
  CLOUDY: 'Cloudy',
  RAIN: 'Rain',
  WINDY: 'Windy',
  STORM: 'Storm',
};

export function ReportDetail({ reportId }: { reportId: string }) {
  const report = useMockState((s) => s.dailyReports.find((r) => r.id === reportId));

  if (!report) {
    return (
      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6">Report not found</Typography>
      </Paper>
    );
  }

  const totalHands = report.manpower.reduce((s, m) => s + m.count, 0);

  return (
    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
      <Stack gap={2.5}>
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
            <Chip label={report.id} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
            <Typography variant="caption" color="text.secondary">
              {report.projectName} · {dayjs(report.reportDate).format('dddd, MMMM D, YYYY')}
            </Typography>
          </Box>
          <Typography variant="h5" fontWeight={700} mb={0.5}>
            Daily report — {report.authorName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Filed {dayjs(report.createdAt).format('MMM D, HH:mm')}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Section title="Work completed">
            <Typography variant="body1">{report.workCompleted}</Typography>
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

        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            Manpower ({totalHands} on site)
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' } }}>
            {report.manpower.map((m) => (
              <Box
                key={m.trade}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                  {m.trade}
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {m.count}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            Equipment ({report.equipment.length})
          </Typography>
          {report.equipment.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No equipment on site.
            </Typography>
          ) : (
            <Stack gap={1}>
              {report.equipment.map((e) => (
                <Box key={e.name} display="flex" justifyContent="space-between">
                  <Typography variant="body2">{e.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {e.hours} hrs
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>

      <Stack gap={2}>
        <Paper
          elevation={0}
          sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            Conditions
          </Typography>
          <Stack gap={1.5}>
            <KV label="Weather" value={WEATHER_LABEL[report.weather]} />
            <KV label="High / Low" value={`${report.highTempF}°F / ${report.lowTempF}°F`} />
            <KV label="Project" value={report.projectName} />
            <KV label="Author" value={report.authorName} />
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
