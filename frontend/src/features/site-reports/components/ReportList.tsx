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
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CloudIcon from '@mui/icons-material/Cloud';
import ThunderstormIcon from '@mui/icons-material/Thunderstorm';
import GrainIcon from '@mui/icons-material/Grain';
import AirIcon from '@mui/icons-material/Air';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useMockState } from '@/store/mock-state.store';
import type { Weather } from '@/mocks/daily-reports.mock';

const WEATHER_ICON: Record<Weather, React.ElementType> = {
  SUNNY: WbSunnyIcon,
  CLOUDY: CloudIcon,
  RAIN: GrainIcon,
  WINDY: AirIcon,
  STORM: ThunderstormIcon,
};

const WEATHER_LABEL: Record<Weather, string> = {
  SUNNY: 'Sunny',
  CLOUDY: 'Cloudy',
  RAIN: 'Rain',
  WINDY: 'Windy',
  STORM: 'Storm',
};

interface ReportListProps {
  detailBasePath: string;
}

export function ReportList({ detailBasePath }: ReportListProps) {
  const reports = useMockState((s) => s.dailyReports);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.authorName.toLowerCase().includes(q) ||
        r.workCompleted.toLowerCase().includes(q),
    );
  }, [reports, search]);

  return (
    <Box>
      <TextField
        size="small"
        fullWidth
        placeholder="Search by ID, author, or work…"
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
          const Icon = WEATHER_ICON[r.weather];
          const totalHands = r.manpower.reduce((s, m) => s + m.count, 0);
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
              <Box
                sx={{
                  width: 56,
                  textAlign: 'center',
                  pr: 2,
                  borderRight: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                  {dayjs(r.reportDate).format('MMM')}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {dayjs(r.reportDate).format('D')}
                </Typography>
              </Box>

              <Box flex={1} minWidth={0}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Chip label={r.id} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                  <Chip
                    icon={<Icon sx={{ fontSize: 14 }} />}
                    label={`${WEATHER_LABEL[r.weather]} · ${r.highTempF}°F`}
                    size="small"
                    sx={{ fontWeight: 500 }}
                  />
                  {r.blockers && (
                    <Chip
                      label="Blockers"
                      size="small"
                      color="warning"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Box>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {r.workCompleted}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {r.authorName} · {totalHands} on site · {r.equipment.length} equipment
                </Typography>
              </Box>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
