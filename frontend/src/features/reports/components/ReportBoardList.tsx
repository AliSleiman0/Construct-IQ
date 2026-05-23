'use client';

import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useAllReports } from '@/features/reports/hooks/useReports';
import type { DailyReport, UserRef } from '@/types/report.types';

interface ReportBoardListProps {
  detailBasePath: string;
}

function authorName(u?: UserRef | null): string {
  if (!u) return 'Unknown';
  return `${u.firstName} ${u.lastName}`.trim() || 'Unknown';
}

export function ReportBoardList({ detailBasePath }: ReportBoardListProps) {
  const { data: reports, isLoading, isError, refetch } = useAllReports();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports ?? [];
    return (reports ?? []).filter(
      (r: DailyReport) =>
        authorName(r.createdBy).toLowerCase().includes(q) ||
        (r.workCompleted ?? '').toLowerCase().includes(q) ||
        (r.project?.name ?? '').toLowerCase().includes(q),
    );
  }, [reports, search]);

  if (isLoading) return <AppLoader />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  return (
    <Box>
      <TextField
        size="small"
        fullWidth
        placeholder="Search by author, project, or work…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, maxWidth: 360 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />
      <Stack gap={1.5}>
        {filtered.length === 0 && (
          <Box textAlign="center" py={5}>
            <Typography variant="body2" color="text.secondary">
              No reports match.
            </Typography>
          </Box>
        )}
        {filtered.map((r) => {
          const totalHands = (r.manpowerEntries ?? []).reduce((s, m) => s + (m.count ?? 0), 0);
          const equipCount = (r.equipmentEntries ?? []).length;
          const weatherLabel = [r.weather, r.highTempC != null ? `${r.highTempC}°C` : null]
            .filter(Boolean)
            .join(' · ');
          return (
            <Paper
              key={r.id}
              elevation={0}
              component={Link}
              href={`${detailBasePath}/${r.id}`}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                gap: 2,
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
                '&:hover': { borderColor: 'primary.light', boxShadow: '0 4px 8px -4px rgba(0,0,0,0.08)' },
              }}
            >
              <Box sx={{ width: 56, textAlign: 'center', pr: 2, borderRight: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                  {dayjs(r.reportDate).format('MMM')}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {dayjs(r.reportDate).format('D')}
                </Typography>
              </Box>

              <Box flex={1} minWidth={0}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                  {r.project?.name && (
                    <Chip label={r.project.name} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                  )}
                  {weatherLabel && <Chip label={weatherLabel} size="small" sx={{ fontWeight: 500 }} />}
                  {r.blockers && <Chip label="Blockers" size="small" color="warning" sx={{ fontWeight: 600 }} />}
                </Box>
                {r.workCompleted && (
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    {r.workCompleted}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {authorName(r.createdBy)} · {totalHands} on site · {equipCount} equipment
                </Typography>
              </Box>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
