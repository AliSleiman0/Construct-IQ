'use client';

import { Box, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import type { Phase, PhaseStatus } from '@/types/phase.types';
import { dateToPercent, shiftDateByDays, type DateWindow } from './timeline.utils';
import { useTimelineDrag, type DragMode } from '../../hooks/useTimelineDrag';

interface PhaseRowProps {
  phase: Phase;
  window: DateWindow;
  windowSpanMs: number;
  getTrackWidth: () => number;
  canEdit?: boolean;
  onClick?: (phase: Phase) => void;
  onCommitDates?: (phaseId: string, payload: { startDate?: string; endDate?: string }) => void;
}

const STATUS_COLOR: Record<PhaseStatus, 'info' | 'primary' | 'warning' | 'success' | 'error'> = {
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

export function PhaseRow({ phase, window, windowSpanMs, getTrackWidth, canEdit = true, onClick, onCommitDates }: PhaseRowProps) {
  const theme = useTheme();
  const hasDates = !!phase.startDate && !!phase.endDate;
  const draggable = canEdit && hasDates && !!onCommitDates;

  const handleCommit = (mode: DragMode, days: number) => {
    if (!draggable || !phase.startDate || !phase.endDate) return;
    if (mode === 'move') {
      onCommitDates!(phase.id, {
        startDate: shiftDateByDays(phase.startDate, days),
        endDate: shiftDateByDays(phase.endDate, days),
      });
    } else if (mode === 'resize-start') {
      const ns = shiftDateByDays(phase.startDate, days);
      if (new Date(ns).getTime() < new Date(phase.endDate).getTime()) {
        onCommitDates!(phase.id, { startDate: ns });
      }
    } else {
      const ne = shiftDateByDays(phase.endDate, days);
      if (new Date(ne).getTime() > new Date(phase.startDate).getTime()) {
        onCommitDates!(phase.id, { endDate: ne });
      }
    }
  };

  const { drag, begin } = useTimelineDrag({
    getTrackWidth,
    windowSpanMs,
    onCommit: handleCommit,
    onClick: () => onClick?.(phase),
  });

  // Optimistic preview while dragging.
  let dStart = 0;
  let dEnd = 0;
  if (drag) {
    if (drag.mode === 'move') { dStart = drag.days; dEnd = drag.days; }
    else if (drag.mode === 'resize-start') dStart = drag.days;
    else dEnd = drag.days;
  }
  const effStart = hasDates ? shiftDateByDays(phase.startDate!, dStart) : null;
  const effEnd = hasDates ? shiftDateByDays(phase.endDate!, dEnd) : null;

  const startPct = hasDates ? dateToPercent(effStart!, window.startMs, window.endMs) : 0;
  const endPct = hasDates ? dateToPercent(effEnd!, window.startMs, window.endMs) : 0;
  const widthPct = hasDates ? Math.max(endPct - startPct, 1) : 6;

  const paletteKey = STATUS_COLOR[phase.status];
  const barColor = theme.palette[paletteKey].main;
  const barFg = theme.palette[paletteKey].contrastText;
  const dragging = !!drag;

  const handleStyle = {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    width: 8,
    cursor: 'ew-resize',
    zIndex: 2,
  };

  return (
    <Box sx={{ position: 'relative', height: 44 }}>
      <Tooltip
        title={
          <>
            <Typography variant="caption" fontWeight={700} sx={{ color: 'common.white' }}>{phase.name}</Typography>
            <Typography variant="caption" display="block" sx={{ color: 'common.white', opacity: 0.85 }}>
              {fmtRange(effStart ?? phase.startDate, effEnd ?? phase.endDate)}
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: 'common.white', opacity: 0.85 }}>
              Status: {phase.status.replace('_', ' ').toLowerCase()}
            </Typography>
          </>
        }
        arrow
        placement="top"
        disableInteractive
      >
        <Box
          role="button"
          tabIndex={0}
          onPointerDown={draggable ? (e) => begin(e, 'move') : undefined}
          onClick={!draggable ? () => onClick?.(phase) : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(phase); }
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
            cursor: draggable ? (dragging ? 'grabbing' : 'grab') : 'pointer',
            border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
            fontSize: '0.75rem',
            fontWeight: 600,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            transition: dragging ? 'none' : 'transform 120ms ease, box-shadow 120ms ease',
            outline: 'none',
            touchAction: 'none',
            boxShadow: dragging ? theme.shadows[4] : undefined,
            '&:hover, &:focus-visible': dragging ? {} : { transform: 'translateY(-1px)', boxShadow: theme.shadows[3] },
            opacity: hasDates ? 1 : 0.6,
          }}
        >
          {draggable && (
            <>
              <Box aria-label="Resize phase start" onPointerDown={(e) => begin(e, 'resize-start')} sx={{ ...handleStyle, left: 0, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }} />
              <Box aria-label="Resize phase end" onPointerDown={(e) => begin(e, 'resize-end')} sx={{ ...handleStyle, right: 0, borderTopRightRadius: 4, borderBottomRightRadius: 4 }} />
            </>
          )}
          <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>
            {phase.name}
            {!hasDates && (
              <Typography component="span" sx={{ ml: 0.75, opacity: 0.85, fontWeight: 500 }}>(no dates)</Typography>
            )}
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  );
}
