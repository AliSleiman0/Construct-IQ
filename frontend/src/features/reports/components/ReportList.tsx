'use client';
import { Box, Stack, Typography, Paper, Divider, Chip } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import type { DailyReport } from '@/types/report.types';

interface ReportListProps {
  reports: DailyReport[];
  onEdit: (report: DailyReport) => void;
}

export function ReportList({ reports, onEdit }: ReportListProps) {
  return (
    <Stack spacing={2}>
      {reports.map((report) => (
        <Paper
          key={report.id}
          variant="outlined"
          sx={{ p: 2.5, borderRadius: 2, cursor: 'pointer', '&:hover': { boxShadow: 2 } }}
          onClick={() => onEdit(report)}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="subtitle2" fontWeight={600}>
                {new Date(report.reportDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>
            </Stack>
            {report.weather && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <WbSunnyIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                <Typography variant="caption" color="text.secondary">{report.weather}</Typography>
              </Stack>
            )}
          </Stack>

          {report.achievements && (
            <Box mb={1}>
              <Typography variant="caption" color="success.main" fontWeight={600}>Achievements</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {report.achievements}
              </Typography>
            </Box>
          )}

          {report.blockers && (
            <Box mb={1}>
              <Typography variant="caption" color="error.main" fontWeight={600}>Blockers</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {report.blockers}
              </Typography>
            </Box>
          )}

          {report.aiSummary && (
            <>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" alignItems="flex-start" spacing={1}>
                <Chip label="AI Summary" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                <Typography variant="caption" color="text.secondary">{report.aiSummary}</Typography>
              </Stack>
            </>
          )}

          {report.createdBy && (
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              By {report.createdBy.firstName} {report.createdBy.lastName}
            </Typography>
          )}
        </Paper>
      ))}
    </Stack>
  );
}
