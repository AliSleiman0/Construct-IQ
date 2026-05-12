'use client';

import { Box, Paper, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import type { ReactNode } from 'react';

const TONE_COLORS: Record<string, string> = {
  primary: '#1976d2',
  info: '#0288d1',
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
};

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: SvgIconComponent;
  tone?: 'primary' | 'info' | 'success' | 'warning' | 'error';
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'primary' }: StatCardProps) {
  const color = TONE_COLORS[tone] ?? TONE_COLORS.primary;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: `${color}14`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 24 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {hint}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2.5,
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
          lg: 'repeat(4, 1fr)',
        },
        mb: 2.5,
      }}
    >
      {children}
    </Box>
  );
}
