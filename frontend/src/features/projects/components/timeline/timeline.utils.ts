import type { Phase } from '@/types/phase.types';
import type { Milestone } from '@/types/milestone.types';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Zoom levels expand the scrollable timeline width by this factor. */
export type ZoomLevel = 1 | 2 | 4;

/**
 * Convert a horizontal pixel drag delta into a whole-day delta, given the
 * pixel width of the (zoomed) timeline track and the window's time span.
 * Snapping to whole days matches the date-only model (phases/tasks store dates).
 */
export function snapDaysDelta(dxPx: number, trackWidthPx: number, windowSpanMs: number): number {
  if (trackWidthPx <= 0 || windowSpanMs <= 0) return 0;
  const msDelta = (dxPx / trackWidthPx) * windowSpanMs;
  return Math.round(msDelta / DAY_MS);
}

/** Shift an ISO/Date value by N whole days, returned as a `YYYY-MM-DD` string. */
export function shiftDateByDays(date: string | Date, days: number): string {
  const ms = new Date(date).getTime() + days * DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

export interface DateWindow {
  startMs: number;
  endMs: number;
}

function toMs(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Compute the timeline's visible date window from the union of phase + milestone
 * dates, falling back to a year centred on today when there's no data.
 * Padded ±2 weeks so bars don't kiss the edges.
 */
export function computeDateWindow(
  phases: Phase[],
  milestones: Milestone[],
  fallbackProject?: { startDate?: string | Date | null; endDate?: string | Date | null },
): DateWindow {
  const stamps: number[] = [];
  for (const p of phases) {
    const s = toMs(p.startDate);
    const e = toMs(p.endDate);
    if (s !== null) stamps.push(s);
    if (e !== null) stamps.push(e);
  }
  for (const m of milestones) {
    const t = toMs(m.targetDate);
    if (t !== null) stamps.push(t);
  }
  if (fallbackProject) {
    const ps = toMs(fallbackProject.startDate ?? null);
    const pe = toMs(fallbackProject.endDate ?? null);
    if (ps !== null) stamps.push(ps);
    if (pe !== null) stamps.push(pe);
  }

  if (stamps.length === 0) {
    // Default: 6 months back, 6 months forward.
    const now = Date.now();
    const halfYear = 183 * 24 * 60 * 60 * 1000;
    return { startMs: now - halfYear, endMs: now + halfYear };
  }

  const min = Math.min(...stamps);
  const max = Math.max(...stamps);

  // Guard against a single-point timeline (one date with no range).
  if (min === max) {
    return { startMs: min - TWO_WEEKS_MS * 6, endMs: max + TWO_WEEKS_MS * 6 };
  }

  return { startMs: min - TWO_WEEKS_MS, endMs: max + TWO_WEEKS_MS };
}

export function dateToPercent(
  date: string | Date,
  startMs: number,
  endMs: number,
): number {
  const span = endMs - startMs;
  if (span <= 0) return 0;
  const t = new Date(date).getTime();
  return ((t - startMs) / span) * 100;
}

export interface QuarterSpan {
  /** 1..4 */
  quarter: number;
  /** Calendar year of the quarter's start. */
  year: number;
  /** Quarter start (Jan 1, Apr 1, Jul 1, Oct 1) in ms. */
  startMs: number;
  /** Next quarter start in ms (exclusive end). */
  endMs: number;
  /** Visible portion (clamped to the window) — left % within the window. */
  leftPct: number;
  /** Visible portion width — % of the window. */
  widthPct: number;
}

export function getQuarters(startMs: number, endMs: number): QuarterSpan[] {
  if (endMs <= startMs) return [];
  const first = new Date(startMs);
  const last = new Date(endMs);

  // Walk quarter starts from the start year through the end year.
  const result: QuarterSpan[] = [];
  for (let year = first.getUTCFullYear(); year <= last.getUTCFullYear(); year++) {
    for (let q = 0; q < 4; q++) {
      const qStart = Date.UTC(year, q * 3, 1);
      const qEnd = Date.UTC(year, (q + 1) * 3, 1);
      if (qEnd <= startMs) continue;
      if (qStart >= endMs) break;
      const visibleStart = Math.max(qStart, startMs);
      const visibleEnd = Math.min(qEnd, endMs);
      const leftPct = ((visibleStart - startMs) / (endMs - startMs)) * 100;
      const widthPct = ((visibleEnd - visibleStart) / (endMs - startMs)) * 100;
      result.push({
        quarter: q + 1,
        year,
        startMs: qStart,
        endMs: qEnd,
        leftPct,
        widthPct,
      });
    }
  }
  return result;
}

export function isTodayInWindow(window: DateWindow): boolean {
  const now = Date.now();
  return now >= window.startMs && now <= window.endMs;
}
