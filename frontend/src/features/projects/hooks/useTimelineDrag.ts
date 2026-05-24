'use client';

import { useCallback, useRef, useState } from 'react';
import { snapDaysDelta } from '../components/timeline/timeline.utils';

export type DragMode = 'move' | 'resize-start' | 'resize-end';

// Matches the Kanban PointerSensor activation distance so a plain click (to open
// the edit modal) still works — only a >8px drag becomes a move/resize.
const THRESHOLD_PX = 8;

interface UseTimelineDragArgs {
  /** Current pixel width of the (zoomed) timeline track — read live, not cached. */
  getTrackWidth: () => number;
  windowSpanMs: number;
  /** Fired on release after a real drag; `days` is a non-zero whole-day delta. */
  onCommit: (mode: DragMode, days: number) => void;
  /** Fired on release when the pointer never crossed the drag threshold (a click). */
  onClick?: () => void;
}

/**
 * Pointer-driven move/resize for a timeline bar. Uses window listeners (robust
 * across fast drags) and an 8px activation threshold so clicks still open the
 * modal. `drag` exposes the live {mode, days} for optimistic preview rendering.
 */
export function useTimelineDrag({ getTrackWidth, windowSpanMs, onCommit, onClick }: UseTimelineDragArgs) {
  const [drag, setDrag] = useState<{ mode: DragMode; days: number } | null>(null);
  const stateRef = useRef<{ startX: number; mode: DragMode; moved: boolean } | null>(null);

  const begin = useCallback(
    (e: React.PointerEvent, mode: DragMode) => {
      e.stopPropagation();
      e.preventDefault();
      stateRef.current = { startX: e.clientX, mode, moved: false };

      const onMove = (ev: PointerEvent) => {
        const st = stateRef.current;
        if (!st) return;
        const dx = ev.clientX - st.startX;
        if (!st.moved && Math.abs(dx) < THRESHOLD_PX) return;
        st.moved = true;
        setDrag({ mode, days: snapDaysDelta(dx, getTrackWidth(), windowSpanMs) });
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        const st = stateRef.current;
        stateRef.current = null;
        setDrag(null);
        const dx = ev.clientX - (st?.startX ?? 0);
        const moved = !!st?.moved && Math.abs(dx) >= THRESHOLD_PX;
        if (moved) {
          const days = snapDaysDelta(dx, getTrackWidth(), windowSpanMs);
          if (days !== 0) onCommit(mode, days);
        } else {
          onClick?.();
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [getTrackWidth, windowSpanMs, onCommit, onClick],
  );

  return { drag, begin };
}
