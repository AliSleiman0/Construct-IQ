import { describe, it, expect } from 'vitest';
import {
  DAY_MS,
  snapDaysDelta,
  shiftDateByDays,
  dateToPercent,
  computeDateWindow,
} from './timeline.utils';
import type { Phase } from '@/types/phase.types';
import type { Milestone } from '@/types/milestone.types';

describe('snapDaysDelta', () => {
  const span = 100 * DAY_MS; // 100-day window
  it('converts a px drag to a whole-day delta', () => {
    expect(snapDaysDelta(10, 1000, span)).toBe(1); // 10/1000 * 100 days = 1
    expect(snapDaysDelta(0, 1000, span)).toBe(0);
    expect(snapDaysDelta(-20, 1000, span)).toBe(-2);
  });
  it('rounds half up (sub-day moves snap to a whole day)', () => {
    expect(snapDaysDelta(5, 1000, span)).toBe(1); // 0.5 day → 1
    expect(snapDaysDelta(4, 1000, span)).toBe(0); // 0.4 day → 0
    expect(snapDaysDelta(15, 1000, span)).toBe(2); // 1.5 day → 2
  });
  it('guards against zero/invalid width or span', () => {
    expect(snapDaysDelta(50, 0, span)).toBe(0);
    expect(snapDaysDelta(50, 1000, 0)).toBe(0);
  });
});

describe('shiftDateByDays', () => {
  it('shifts forward and back, returning YYYY-MM-DD', () => {
    expect(shiftDateByDays('2026-03-01', 5)).toBe('2026-03-06');
    expect(shiftDateByDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDateByDays('2026-03-01', 0)).toBe('2026-03-01');
  });
});

describe('dateToPercent', () => {
  const start = Date.UTC(2026, 0, 1);
  const end = Date.UTC(2026, 0, 11); // 10-day span
  it('maps a date to its % position in the window', () => {
    expect(dateToPercent(new Date(Date.UTC(2026, 0, 6)), start, end)).toBe(50);
    expect(dateToPercent(new Date(start), start, end)).toBe(0);
    expect(dateToPercent(new Date(end), start, end)).toBe(100);
  });
  it('returns 0 for a non-positive span', () => {
    expect(dateToPercent(new Date(start), start, start)).toBe(0);
  });
});

describe('computeDateWindow', () => {
  it('defaults to ~1 year centred on now when there is no data', () => {
    const w = computeDateWindow([], []);
    expect(w.endMs - w.startMs).toBe(2 * 183 * DAY_MS);
  });

  it('folds task dates into the window (padded ±2 weeks)', () => {
    const taskStart = Date.UTC(2026, 4, 1); // May 1
    const taskEnd = Date.UTC(2026, 4, 10); // May 10
    const w = computeDateWindow([], [], undefined, [
      { startDate: '2026-05-01', dueDate: '2026-05-10' },
    ]);
    // The window must contain both task dates.
    expect(w.startMs).toBeLessThanOrEqual(taskStart);
    expect(w.endMs).toBeGreaterThanOrEqual(taskEnd);
    expect(w.endMs).toBeGreaterThan(w.startMs);
  });

  it('expands a single-point timeline so it is not zero-width', () => {
    const milestones = [{ targetDate: '2026-06-01' }] as unknown as Milestone[];
    const w = computeDateWindow([] as Phase[], milestones);
    const point = Date.UTC(2026, 5, 1);
    expect(w.startMs).toBeLessThan(point);
    expect(w.endMs).toBeGreaterThan(point);
  });
});
