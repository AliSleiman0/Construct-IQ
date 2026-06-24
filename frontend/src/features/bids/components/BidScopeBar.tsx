'use client';

import { Box, LinearProgress, Stack, Typography } from '@mui/material';

function colorFor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

export function BidScopeBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <Stack spacing={0.5}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="text.secondary">
          Scope completeness
        </Typography>
        <Typography variant="caption" fontWeight={600}>
          {clamped}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={clamped}
        color={colorFor(clamped)}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Stack>
  );
}
