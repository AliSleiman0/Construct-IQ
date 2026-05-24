'use client';

import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import type { Milestone, MilestoneStatus } from '@/types/milestone.types';
import { dateToPercent, shiftDateByDays, type DateWindow } from './timeline.utils';
import { useTimelineDrag } from '../../hooks/useTimelineDrag';

interface MilestonePinProps {
  milestone: Milestone;
  window: DateWindow;
  totalHeight: number;
  windowSpanMs: number;
  getTrackWidth: () => number;
  canEdit?: boolean;
  onClick?: (milestone: Milestone) => void;
  onCommitDate?: (milestoneId: string, targetDate: string) => void;
}

const STATUS_COLOR: Record<MilestoneStatus, 'warning' | 'info' | 'success'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
};

export function MilestonePin({
  milestone, window, totalHeight, windowSpanMs, getTrackWidth, canEdit = true, onClick, onCommitDate,
}: MilestonePinProps) {
  const theme = useTheme();
  const draggable = canEdit && !!milestone.targetDate && !!onCommitDate;

  const { drag, begin } = useTimelineDrag({
    getTrackWidth,
    windowSpanMs,
    onCommit: (_mode, days) => {
      if (milestone.targetDate) onCommitDate!(milestone.id, shiftDateByDays(milestone.targetDate, days));
    },
    onClick: () => onClick?.(milestone),
  });

  if (!milestone.targetDate) return null;

  const effDate = drag ? shiftDateByDays(milestone.targetDate, drag.days) : milestone.targetDate;
  const leftPct = dateToPercent(effDate, window.startMs, window.endMs);
  if (leftPct < 0 || leftPct > 100) return null;

  const paletteKey = STATUS_COLOR[milestone.status];
  const color = theme.palette[paletteKey].main;

  return (
    <Box
      sx={{
        position: 'absolute',
        left: `${leftPct}%`,
        top: 0,
        height: totalHeight,
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      {/* Vertical guide */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: '50%',
          top: 18,
          bottom: 0,
          width: 0,
          borderLeft: `1px dashed ${color}`,
          transform: 'translateX(-50%)',
          opacity: 0.6,
        }}
      />
      {/* Label + dot — clickable */}
      <Tooltip
        title={
          <>
            <Typography variant="caption" fontWeight={700} sx={{ color: 'common.white' }}>
              {milestone.name}
            </Typography>
            <Typography
              variant="caption"
              display="block"
              sx={{ color: 'common.white', opacity: 0.85 }}
            >
              {dayjs(milestone.targetDate).format('MMM D, YYYY')}
            </Typography>
            <Typography
              variant="caption"
              display="block"
              sx={{ color: 'common.white', opacity: 0.85 }}
            >
              Status: {milestone.status.replace('_', ' ').toLowerCase()} ·{' '}
              {milestone.percentComplete}%
            </Typography>
          </>
        }
        arrow
        placement="top"
      >
        <Box
          role="button"
          tabIndex={0}
          onPointerDown={draggable ? (e) => begin(e, 'move') : undefined}
          onClick={!draggable ? () => onClick?.(milestone) : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick?.(milestone);
            }
          }}
          sx={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.25,
            cursor: draggable ? (drag ? 'grabbing' : 'grab') : 'pointer',
            pointerEvents: 'auto',
            outline: 'none',
            touchAction: 'none',
            '&:focus-visible > .pin-dot': {
              boxShadow: `0 0 0 3px ${color}33`,
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: '0.6875rem',
              color: 'text.primary',
              bgcolor: 'background.paper',
              px: 0.5,
              borderRadius: 0.5,
              whiteSpace: 'nowrap',
              maxWidth: 140,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {milestone.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 500,
              fontSize: '0.625rem',
              color: 'text.secondary',
              bgcolor: 'background.paper',
              px: 0.5,
              borderRadius: 0.5,
              whiteSpace: 'nowrap',
            }}
          >
            {dayjs(milestone.targetDate).format('MMM D')}
          </Typography>
          <Box
            className="pin-dot"
            data-testid={milestone.isMajor ? 'major-milestone-marker' : 'milestone-marker'}
            sx={{
              width: milestone.isMajor ? 16 : 10,
              height: milestone.isMajor ? 16 : 10,
              borderRadius: milestone.isMajor ? 0.5 : '50%',
              transform: milestone.isMajor ? 'rotate(45deg)' : 'none',
              bgcolor: color,
              border: milestone.isMajor ? '2px solid' : '2px solid',
              borderColor: 'background.paper',
              boxShadow: milestone.isMajor ? `0 0 0 1.5px ${color}` : 'none',
              mt: 0.25,
            }}
          />
        </Box>
      </Tooltip>
    </Box>
  );
}
