'use client';

import { Box, Typography } from '@mui/material';

interface MiniBarChartProps {
  title?: string;
  data: { label: string; value: number }[];
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
      <Box display="flex" alignItems="stretch" gap={1} height={140}>
        {data.map((d) => {
          const pct = (d.value / max) * 100;
          return (
            <Box key={d.label} flex={1} display="flex" flexDirection="column" alignItems="center" gap={0.5}>
              {/* Bar track fills the column so the bar's % height resolves against a definite height. */}
              <Box flex={1} width="100%" minHeight={0} display="flex" alignItems="flex-end" justifyContent="center">
                <Box
                  sx={{
                    width: '100%',
                    height: `${pct}%`,
                    minHeight: d.value > 0 ? 4 : 0,
                    bgcolor: color,
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.8,
                    transition: 'opacity 0.15s',
                    '&:hover': { opacity: 1 },
                  }}
                  title={`${d.label}: ${d.value}`}
                />
              </Box>
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
