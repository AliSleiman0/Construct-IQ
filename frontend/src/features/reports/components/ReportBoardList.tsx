'use client';

import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  TextField,
  InputAdornment,
  Pagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useReportsPaged } from '@/features/reports/hooks/useReports';
import type { DailyReport, UserRef } from '@/types/report.types';

interface ReportBoardListProps {
  detailBasePath: string;
}

const PAGE_SIZE = 20;

function authorName(u?: UserRef | null): string {
  if (!u) return 'Unknown';
  return `${u.firstName} ${u.lastName}`.trim() || 'Unknown';
}

export function ReportBoardList({ detailBasePath }: ReportBoardListProps) {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useReportsPaged({
    from: from || undefined,
    to: to || undefined,
    limit: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Client-side search over the current page (server filters are date range).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (r: DailyReport) =>
        authorName(r.createdBy).toLowerCase().includes(q) ||
        (r.workCompleted ?? '').toLowerCase().includes(q) ||
        (r.project?.name ?? '').toLowerCase().includes(q),
    );
  }, [items, search]);

  // keepPreviousData keeps the list painted across page changes; only block on the first load.
  if (isLoading && !data) return <AppLoader />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={2} alignItems={{ sm: 'center' }}>
        <TextField
          size="small"
          placeholder="Search by author, project, or work…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 200, maxWidth: 360 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          type="date"
          size="small"
          label="From"
          fullWidth={false}
          InputLabelProps={{ shrink: true }}
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
          sx={{ width: 170 }}
        />
        <TextField
          type="date"
          size="small"
          label="To"
          fullWidth={false}
          InputLabelProps={{ shrink: true }}
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
          sx={{ width: 170 }}
        />
      </Stack>
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

      {pageCount > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
}
