'use client';

import { Box, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import type { Task, TaskStatus } from '@/types/task.types';
import { dateToPercent, shiftDateByDays, type DateWindow } from './timeline.utils';
import { useTimelineDrag, type DragMode } from '../../hooks/useTimelineDrag';

export const TASK_ROW_HEIGHT = 34;
export const TASK_ROW_GAP = 6;

const STATUS_COLOR: Record<TaskStatus, 'info' | 'primary' | 'warning' | 'success' | 'error'> = {
  TODO: 'info',
  IN_PREPARATION: 'info',
  IN_PROGRESS: 'primary',
  BLOCKED: 'error',
  REVIEW: 'warning',
  DONE: 'success',
};

interface TaskRowProps {
  task: Task;
  window: DateWindow;
  windowSpanMs: number;
  getTrackWidth: () => number;
  canEdit?: boolean;
  onOpen?: (task: Task) => void;
  onCommitDates?: (taskId: string, payload: { startDate?: string; dueDate?: string }) => void;
}

export function TaskRow({ task, window, windowSpanMs, getTrackWidth, canEdit = true, onOpen, onCommitDates }: TaskRowProps) {
  const theme = useTheme();
  const hasBoth = !!task.startDate && !!task.dueDate;
  const dueOnly = !task.startDate && !!task.dueDate;
  const draggable = canEdit && hasBoth && !!onCommitDates;

  const handleCommit = (mode: DragMode, days: number) => {
    if (!draggable || !task.startDate || !task.dueDate) return;
    if (mode === 'move') {
      onCommitDates!(task.id, { startDate: shiftDateByDays(task.startDate, days), dueDate: shiftDateByDays(task.dueDate, days) });
    } else if (mode === 'resize-start') {
      const ns = shiftDateByDays(task.startDate, days);
      if (new Date(ns).getTime() < new Date(task.dueDate).getTime()) onCommitDates!(task.id, { startDate: ns });
    } else {
      const ne = shiftDateByDays(task.dueDate, days);
      if (new Date(ne).getTime() > new Date(task.startDate).getTime()) onCommitDates!(task.id, { dueDate: ne });
    }
  };

  const { drag, begin } = useTimelineDrag({
    getTrackWidth,
    windowSpanMs,
    onCommit: handleCommit,
    onClick: () => onOpen?.(task),
  });

  let dStart = 0;
  let dEnd = 0;
  if (drag) {
    if (drag.mode === 'move') { dStart = drag.days; dEnd = drag.days; }
    else if (drag.mode === 'resize-start') dStart = drag.days;
    else dEnd = drag.days;
  }

  const paletteKey = STATUS_COLOR[task.status];
  const barColor = theme.palette[paletteKey].main;
  const barFg = theme.palette[paletteKey].contrastText;
  const dragging = !!drag;

  // Geometry: both dates → span; due-only → 1-day marker ending at dueDate; none → left pill.
  let startPct: number;
  let widthPct: number;
  if (hasBoth) {
    const s = dateToPercent(shiftDateByDays(task.startDate!, dStart), window.startMs, window.endMs);
    const e = dateToPercent(shiftDateByDays(task.dueDate!, dEnd), window.startMs, window.endMs);
    startPct = s;
    widthPct = Math.max(e - s, 1);
  } else if (dueOnly) {
    const e = dateToPercent(task.dueDate!, window.startMs, window.endMs);
    startPct = Math.max(e - 1, 0);
    widthPct = 2;
  } else {
    startPct = 0;
    widthPct = 5;
  }

  const handleStyle = { position: 'absolute' as const, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 2 };

  return (
    <Box sx={{ position: 'relative', height: TASK_ROW_HEIGHT }}>
      <Tooltip
        arrow
        placement="top"
        disableInteractive
        title={
          <>
            <Typography variant="caption" fontWeight={700} sx={{ color: 'common.white' }}>{task.title}</Typography>
            <Typography variant="caption" display="block" sx={{ color: 'common.white', opacity: 0.85 }}>
              {task.startDate ? dayjs(task.startDate).format('MMM D') : '?'} → {task.dueDate ? dayjs(task.dueDate).format('MMM D, YYYY') : '?'}
            </Typography>
          </>
        }
      >
        <Box
          role="button"
          tabIndex={0}
          onPointerDown={draggable ? (e) => begin(e, 'move') : undefined}
          onClick={!draggable ? () => onOpen?.(task) : undefined}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(task); } }}
          sx={{
            position: 'absolute',
            top: 4,
            bottom: 4,
            left: `${startPct}%`,
            width: `${widthPct}%`,
            minWidth: 20,
            borderRadius: 0.75,
            bgcolor: alpha(barColor, 0.85),
            color: barFg,
            display: 'flex',
            alignItems: 'center',
            px: 1,
            cursor: draggable ? (dragging ? 'grabbing' : 'grab') : 'pointer',
            border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
            fontSize: '0.6875rem',
            fontWeight: 600,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            transition: dragging ? 'none' : 'box-shadow 120ms ease',
            outline: 'none',
            touchAction: 'none',
            boxShadow: dragging ? theme.shadows[4] : undefined,
            opacity: hasBoth || dueOnly ? 1 : 0.55,
            '&:hover': dragging ? {} : { boxShadow: theme.shadows[2] },
          }}
        >
          {draggable && (
            <>
              <Box aria-label="Resize task start" onPointerDown={(e) => begin(e, 'resize-start')} sx={{ ...handleStyle, left: 0 }} />
              <Box aria-label="Resize task end" onPointerDown={(e) => begin(e, 'resize-end')} sx={{ ...handleStyle, right: 0 }} />
            </>
          )}
          <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>
            {task.title}{!hasBoth && !dueOnly && <Typography component="span" sx={{ ml: 0.5, opacity: 0.85, fontWeight: 500 }}>(no dates)</Typography>}
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  );
}
