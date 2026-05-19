'use client';

import { Box, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import type { Phase, PhaseStatus } from '@/types/phase.types';
import { dateToPercent, type DateWindow } from './timeline.utils';

interface PhaseRowProps {
  phase: Phase;
  window: DateWindow;
  onClick?: (phase: Phase) => void;
}

const STATUS_COLOR: Record<
  PhaseStatus,
  'info' | 'primary' | 'warning' | 'success' | 'error'
> = {
  PLANNING: 'info',
  ACTIVE: 'primary',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

function fmtRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return 'No dates set';
  const s = start ? dayjs(start).format('MMM D, YYYY') : '?';
  const e = end ? dayjs(end).format('MMM D, YYYY') : '?';
  return `${s} → ${e}`;
}

export function PhaseRow({ phase, window, onClick }: PhaseRowProps) {
  const theme = useTheme();

  // A phase with no dates is rendered as a thin "unscheduled" pill at the left edge.
  const hasDates = !!phase.startDate && !!phase.endDate;
  const startPct = hasDates ? dateToPercent(phase.startDate!, window.startMs, window.endMs) : 0;
  const endPct = hasDates ? dateToPercent(phase.endDate!, window.startMs, window.endMs) : 0;
  const widthPct = hasDates ? Math.max(endPct - startPct, 1) : 6;

  const paletteKey = STATUS_COLOR[phase.status];
  const barColor = theme.palette[paletteKey].main;
  const barFg = theme.palette[paletteKey].contrastText;

  return (
    <Box sx={{ position: 'relative', height: 44 }}>
      <Tooltip
        title={
          <>
            <Typography variant="caption" fontWeight={700} sx={{ color: 'common.white' }}>
              {phase.name}
            </Typography>
            <Typography
              variant="caption"
              display="block"
              sx={{ color: 'common.white', opacity: 0.85 }}
            >
              {fmtRange(phase.startDate, phase.endDate)}
            </Typography>
            <Typography
              variant="caption"
              display="block"
              sx={{ color: 'common.white', opacity: 0.85 }}
            >
              Status: {phase.status.replace('_', ' ').toLowerCase()}
            </Typography>
          </>
        }
        arrow
        placement="top"
      >
        <Box
          role="button"
          tabIndex={0}
          onClick={() => onClick?.(phase)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick?.(phase);
            }
          }}
          sx={{
            position: 'absolute',
            top: 6,
            bottom: 6,
            left: `${startPct}%`,
            width: `${widthPct}%`,
            minWidth: 28,
            borderRadius: 1,
            bgcolor: barColor,
            color: barFg,
            display: 'flex',
            alignItems: 'center',
            px: 1.25,
            gap: 1,
            cursor: 'pointer',
            border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
            fontSize: '0.75rem',
            fontWeight: 600,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            transition: 'transform 120ms ease, box-shadow 120ms ease',
            outline: 'none',
            '&:hover, &:focus-visible': {
              transform: 'translateY(-1px)',
              boxShadow: theme.shadows[3],
            },
            opacity: hasDates ? 1 : 0.6,
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: 'inherit',
              fontWeight: 'inherit',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {phase.name}
            {!hasDates && (
              <Typography
                component="span"
                sx={{ ml: 0.75, opacity: 0.85, fontWeight: 500 }}
              >
                (no dates)
              </Typography>
            )}
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  );
}
