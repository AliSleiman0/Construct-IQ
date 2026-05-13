'use client';

import { Box, Paper, Typography, Stack } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';

interface GanttBar {
  label: string;
  start: number;       // 0–100 (% of timeline)
  duration: number;    // 0–100
  color: string;
}

const PHASES: GanttBar[] = [
  { label: 'Site preparation', start: 0, duration: 8, color: '#16a34a' },
  { label: 'Foundation', start: 8, duration: 16, color: '#16a34a' },
  { label: 'Structural frame', start: 18, duration: 28, color: '#16a34a' },
  { label: 'Building envelope', start: 38, duration: 25, color: '#1976d2' },
  { label: 'MEP rough-in', start: 50, duration: 30, color: '#1976d2' },
  { label: 'Interior finishes', start: 70, duration: 22, color: '#94a3b8' },
  { label: 'Common areas', start: 84, duration: 12, color: '#94a3b8' },
  { label: 'Handover', start: 95, duration: 5, color: '#94a3b8' },
];

const MONTHS = [
  'Sep', 'Nov', 'Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov', 'Jan', 'Mar',
];

export default function PMSchedulePage() {
  return (
    <Box>
      <PageHeader
        title="Schedule"
        subtitle="Tower Heights · Gantt view of phases & milestones."
      />

      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
      >
        {/* Month headers */}
        <Box display="flex" mb={2} pl={20}>
          <Box flex={1} display="flex" justifyContent="space-between">
            {MONTHS.map((m) => (
              <Typography key={m} variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {m}
              </Typography>
            ))}
          </Box>
        </Box>

        <Stack gap={1.5}>
          {PHASES.map((phase) => (
            <Box key={phase.label} display="flex" alignItems="center" gap={2}>
              <Typography
                variant="body2"
                fontWeight={500}
                sx={{
                  width: 160,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {phase.label}
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  height: 24,
                  position: 'relative',
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${phase.start}%`,
                    width: `${phase.duration}%`,
                    height: '100%',
                    bgcolor: phase.color,
                    borderRadius: 1,
                    opacity: 0.85,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.65rem' }}>
                    {phase.duration}wk
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Stack>

        <Box mt={3} display="flex" gap={3}>
          <LegendDot color="#16a34a" label="Complete" />
          <LegendDot color="#1976d2" label="In progress" />
          <LegendDot color="#94a3b8" label="Upcoming" />
        </Box>
      </Paper>
    </Box>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: color }} />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
