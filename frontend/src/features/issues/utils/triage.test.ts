import { describe, it, expect } from 'vitest';
import { isStale, ageLabel, SEVERITY_RANK, STATUS_RANK, STALE_DAYS } from './triage';

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

describe('isStale', () => {
  it('flags active issues older than the threshold', () => {
    expect(isStale({ status: 'OPEN', createdAt: daysAgo(STALE_DAYS + 1) })).toBe(true);
    expect(isStale({ status: 'IN_PROGRESS', createdAt: daysAgo(STALE_DAYS + 1) })).toBe(true);
  });
  it('does not flag fresh active issues', () => {
    expect(isStale({ status: 'OPEN', createdAt: daysAgo(1) })).toBe(false);
  });
  it('never flags resolved/closed issues regardless of age', () => {
    expect(isStale({ status: 'RESOLVED', createdAt: daysAgo(100) })).toBe(false);
    expect(isStale({ status: 'CLOSED', createdAt: daysAgo(100) })).toBe(false);
  });
});

describe('ageLabel', () => {
  it('formats hours, days, then weeks', () => {
    expect(ageLabel(hoursAgo(3))).toBe('3h');
    expect(ageLabel(daysAgo(5))).toBe('5d');
    expect(ageLabel(daysAgo(21))).toBe('3w');
  });
  it('clamps a future date to 0h', () => {
    expect(ageLabel(new Date(Date.now() + 60_000).toISOString())).toBe('0h');
  });
});

describe('ranks', () => {
  it('order CRITICAL/OPEN highest', () => {
    expect(SEVERITY_RANK.CRITICAL).toBeGreaterThan(SEVERITY_RANK.HIGH);
    expect(SEVERITY_RANK.HIGH).toBeGreaterThan(SEVERITY_RANK.LOW);
    expect(STATUS_RANK.OPEN).toBeGreaterThan(STATUS_RANK.RESOLVED);
    expect(STATUS_RANK.RESOLVED).toBeGreaterThan(STATUS_RANK.CLOSED);
  });
});
