'use client';

import { Box, Typography, alpha, useTheme } from '@mui/material';
import {
  dateToPercent,
  getQuarters,
  isTodayInWindow,
  type DateWindow,
} from './timeline.utils';

interface TimelineAxisProps {
  window: DateWindow;
}

/**
 * Quarterly band — Q1..Q4 spans, alternating tint, plus a "Today" line.
 */
export function TimelineAxis({ window }: TimelineAxisProps) {
  const theme = useTheme();
  const quarters = getQuarters(window.startMs, window.endMs);
  const showToday = isTodayInWindow(window);
  const todayPct = showToday ? dateToPercent(new Date(), window.startMs, window.endMs) : 0;

  // Two-tone bands: even-indexed quarters use primary; odd use warning — read
  // from theme so dark mode + brand-color repaint cleanly.
  const tints = [
    alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.55 : 0.75),
    alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.55 : 0.75),
  ];

  return (
    <Box sx={{ position: 'relative', height: 40, mb: 1 }}>
      {/* Quarter bands */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: 1,
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {quarters.map((q, idx) => (
          <Box
            key={`${q.year}-Q${q.quarter}`}
            sx={{
              position: 'absolute',
              left: `${q.leftPct}%`,
              width: `${q.widthPct}%`,
              top: 0,
              bottom: 0,
              bgcolor: tints[idx % 2],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'common.white',
              fontWeight: 700,
              letterSpacing: 0.6,
              fontSize: '0.8125rem',
            }}
          >
            {q.widthPct > 5 && (
              <Typography
                component="span"
                sx={{ fontWeight: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}
              >
                Q{q.quarter}
                {quarters.length > 4 && (
                  <Typography
                    component="span"
                    sx={{ ml: 0.5, opacity: 0.85, fontSize: '0.6875rem', fontWeight: 600 }}
                  >
                    {q.year}
                  </Typography>
                )}
              </Typography>
            )}
          </Box>
        ))}
      </Box>

      {/* Today indicator */}
      {showToday && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: `${todayPct}%`,
            top: -10,
            bottom: -10,
            width: 0,
            borderLeft: `2px solid ${theme.palette.error.main}`,
            transform: 'translateX(-50%)',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              top: -18,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'error.main',
              fontWeight: 700,
              bgcolor: 'background.paper',
              px: 0.5,
              borderRadius: 0.5,
              whiteSpace: 'nowrap',
            }}
          >
            Today
          </Typography>
        </Box>
      )}
    </Box>
  );
}
