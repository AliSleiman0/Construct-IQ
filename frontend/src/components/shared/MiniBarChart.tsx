'use client';

import { Box, Typography } from '@mui/material';

interface MiniBarChartProps {
  title?: string;
  data: { label: string; value: number; color?: string }[];
  color?: string;
}

export function MiniBarChart({ title, data, color = '#1976d2' }: MiniBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <Box>
      {title && (
        <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
          {title}
        </Typography>
      )}
      <Box display="flex" alignItems="flex-end" gap={1} height={140}>
        {data.map((d) => {
          const pct = (d.value / max) * 100;
          return (
            <Box key={d.label} flex={1} display="flex" flexDirection="column" alignItems="center" gap={0.5}>
              <Box
                sx={{
                  width: '100%',
                  height: `${pct}%`,
                  minHeight: 4,
                  bgcolor: d.color || color,
                  borderRadius: '4px 4px 0 0',
                  opacity: 0.8,
                  transition: 'opacity 0.15s',
                  '&:hover': { opacity: 1 },
                }}
                title={`${d.label}: ${d.value}`}
              />
              <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                {d.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
