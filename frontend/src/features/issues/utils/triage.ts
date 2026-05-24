import type { Issue, IssueSeverity, IssueStatus } from '@/types/issue.types';

export const STALE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Higher = more urgent — mirrors the backend ranks (client fallback / display). */
export const SEVERITY_RANK: Record<IssueSeverity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
export const STATUS_RANK: Record<IssueStatus, number> = { CLOSED: 0, RESOLVED: 1, IN_PROGRESS: 2, OPEN: 3 };

const ACTIVE: IssueStatus[] = ['OPEN', 'IN_PROGRESS'];

/** An issue is "stale" when it's still active and older than `days`. */
export function isStale(issue: Pick<Issue, 'status' | 'createdAt'>, days = STALE_DAYS): boolean {
  if (!ACTIVE.includes(issue.status)) return false;
  const age = Date.now() - new Date(issue.createdAt).getTime();
  return age > days * DAY_MS;
}

/** Compact age label from a creation timestamp: "3h", "5d", "2w". */
export function ageLabel(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  if (ms < 0) return '0h';
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}
