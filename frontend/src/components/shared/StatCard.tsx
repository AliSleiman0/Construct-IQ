'use client';

import { Box, Typography, Paper } from '@mui/material';
import type { ElementType, ReactNode } from 'react';

export type StatTone = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ElementType;
  tone?: StatTone;
}

const TONE_BG: Record<StatTone, string> = {
  default: '#f1f5f9',
  primary: '#dbeafe',
  success: '#dcfce7',
  warning: '#fef3c7',
  error: '#fee2e2',
  info: '#e0f2fe',
};

const TONE_FG: Record<StatTone, string> = {
  default: '#475569',
  primary: '#1e40af',
  success: '#166534',
  warning: '#92400e',
  error: '#991b1b',
  info: '#075985',
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'default' }: StatCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minHeight: 110,
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          {label}
        </Typography>
        {Icon && (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: TONE_BG[tone],
              color: TONE_FG[tone],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon sx={{ fontSize: 18 }} />
          </Box>
        )}
      </Box>
      <Typography variant="h4" fontWeight={700} color="text.primary">
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Paper>
  );
}

interface StatGridProps {
  children: ReactNode;
}

export function StatGrid({ children }: StatGridProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        mb: 3,
      }}
    >
      {children}
    </Box>
  );
}
