'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { portalApi, PortalProjectData, PortalTask, PortalIssue } from '@/lib/api/portal.api';

// ── Constants ─────────────────────────────────────────────────────────────────

const PROJECT_STATUS_COLOR: Record<string, string> = {
  PLANNING: '#6366f1', ACTIVE: '#22c55e', ON_HOLD: '#f59e0b',
  COMPLETED: '#3b82f6', CANCELLED: '#ef4444',
};
const PROJECT_STATUS_LABEL: Record<string, string> = {
  PLANNING: 'Planning', ACTIVE: 'Active', ON_HOLD: 'On Hold',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};
const TASK_STATUS_ORDER = ['TODO', 'IN_PREPARATION', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE'];
const TASK_STATUS_LABEL: Record<string, string> = {
  TODO: 'To Do', IN_PREPARATION: 'Preparing', IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked', REVIEW: 'In Review', DONE: 'Done',
};
const TASK_STATUS_COLOR: Record<string, string> = {
  TODO: '#94a3b8', IN_PREPARATION: '#a78bfa', IN_PROGRESS: '#3b82f6',
  BLOCKED: '#ef4444', REVIEW: '#f59e0b', DONE: '#22c55e',
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
};
const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#64748b', MEDIUM: '#3b82f6', HIGH: '#f59e0b', CRITICAL: '#ef4444',
};
const PRIORITY_BG: Record<string, string> = {
  LOW: '#f1f5f9', MEDIUM: '#eff6ff', HIGH: '#fffbeb', CRITICAL: '#fef2f2',
};
const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
};
const SEVERITY_COLOR: Record<string, string> = {
  LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444',
};
const SEVERITY_BG: Record<string, string> = {
  LOW: '#f0fdf4', MEDIUM: '#fffbeb', HIGH: '#fff7ed', CRITICAL: '#fef2f2',
};
const ISSUE_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed',
};
const ISSUE_STATUS_COLOR: Record<string, string> = {
  OPEN: '#f59e0b', IN_PROGRESS: '#3b82f6', RESOLVED: '#22c55e', CLOSED: '#94a3b8',
};
const ISSUE_TYPE_LABEL: Record<string, string> = {
  GENERAL: 'General', TECHNICAL: 'Technical', QUALITY: 'Quality',
  SAFETY: 'Safety', PROCUREMENT: 'Procurement', BUDGET: 'Budget',
};
const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDaysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

// ── DonutRing (SVG) ───────────────────────────────────────────────────────────

function DonutRing({ pct, color }: { pct: number; color: string }) {
  const r = 46;
  const cx = 60;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
      <svg width={120} height={120} viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e2e8f0" strokeWidth={12} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={12}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>done</span>
      </div>
    </div>
  );
}

// ── StackedBar ────────────────────────────────────────────────────────────────

function StackedBar({ data }: { data: { label: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;
  const active = data.filter(d => d.count > 0);
  return (
    <div>
      <div style={{ display: 'flex', height: 22, borderRadius: 99, overflow: 'hidden', gap: 2 }}>
        {active.map((d, i) => (
          <div key={i} title={`${d.label}: ${d.count}`} style={{
            flex: d.count / total, backgroundColor: d.color, minWidth: 4, cursor: 'default',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 14 }}>
        {active.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>{d.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HBar ──────────────────────────────────────────────────────────────────────

function HBar({ label, count, total, color, bg }: { label: string; count: number; total: number; color: string; bg: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, backgroundColor: bg, color }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{count} <span style={{ fontWeight: 400, color: '#94a3b8' }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 7, backgroundColor: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: PortalProjectData }) {
  const { tasks, issues, team } = data;
  const doneCount = tasks.byStatus['DONE'] ?? 0;
  const pct = tasks.total > 0 ? Math.round((doneCount / tasks.total) * 100) : 0;
  const pctColor = pct === 100 ? '#22c55e' : pct >= 60 ? '#3b82f6' : '#f59e0b';

  const taskBarData = TASK_STATUS_ORDER.map(s => ({
    label: TASK_STATUS_LABEL[s] ?? s,
    count: tasks.byStatus[s] ?? 0,
    color: TASK_STATUS_COLOR[s] ?? '#94a3b8',
  }));

  const upcomingDeadlines = (tasks.items ?? [])
    .filter(t => t.status !== 'DONE' && t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total Tasks', value: tasks.total, accent: '#3b82f6' },
          { label: 'Completed', value: doneCount, accent: '#22c55e' },
          { label: 'Open Issues', value: issues.open, accent: '#f59e0b' },
          { label: 'Team Members', value: team.length, accent: '#8b5cf6' },
        ].map(({ label, value, accent }) => (
          <div key={label} style={{
            backgroundColor: '#fff', borderRadius: 12, padding: '20px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderTop: `3px solid ${accent}`,
          }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Progress + deadlines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <p style={sectionTitle}>Overall Completion</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <DonutRing pct={pct} color={pctColor} />
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748b' }}>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 16 }}>{doneCount}</span> of <strong>{tasks.total}</strong> tasks done
              </p>
              {tasks.total > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(['DONE', 'IN_PROGRESS', 'BLOCKED'] as const).map(s => {
                    const c = tasks.byStatus[s] ?? 0;
                    if (c === 0) return null;
                    return (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: TASK_STATUS_COLOR[s] }} />
                        <span style={{ fontSize: 12, color: '#64748b' }}>{TASK_STATUS_LABEL[s]}: <strong style={{ color: '#0f172a' }}>{c}</strong></span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <p style={sectionTitle}>Upcoming Deadlines</p>
          {upcomingDeadlines.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>No upcoming deadlines.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingDeadlines.map(t => {
                const days = getDaysLeft(t.dueDate);
                const isOverdue = days !== null && days < 0;
                const isUrgent = days !== null && days >= 0 && days <= 3;
                return (
                  <div key={t.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: 8,
                    backgroundColor: isOverdue ? '#fef2f2' : isUrgent ? '#fffbeb' : '#f8fafc',
                    border: `1px solid ${isOverdue ? '#fecaca' : isUrgent ? '#fde68a' : '#e2e8f0'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: TASK_STATUS_COLOR[t.status] ?? '#94a3b8', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isOverdue ? '#ef4444' : isUrgent ? '#d97706' : '#64748b', flexShrink: 0, marginLeft: 12 }}>
                      {days === null ? '—' : days < 0 ? `${Math.abs(days)}d late` : days === 0 ? 'Due today' : `${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Task distribution */}
      <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
        <p style={sectionTitle}>Task Distribution</p>
        {tasks.total === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>No tasks added yet.</p>
        ) : (
          <StackedBar data={taskBarData} />
        )}
      </div>

      {/* Issue overview */}
      {issues.total > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <p style={{ ...sectionTitle, margin: 0 }}>Issues Overview</p>
            <div style={{ display: 'flex', gap: 20 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                Open: <strong style={{ color: '#f59e0b', fontSize: 16 }}>{issues.open}</strong>
              </span>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                Resolved: <strong style={{ color: '#22c55e', fontSize: 16 }}>{issues.resolved}</strong>
              </span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0 32px' }}>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
              const count = issues.bySeverity?.[sev] ?? 0;
              if (count === 0) return null;
              return <HBar key={sev} label={SEVERITY_LABEL[sev]} count={count} total={issues.total} color={SEVERITY_COLOR[sev]} bg={SEVERITY_BG[sev]} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────

function TasksTab({ data }: { data: PortalProjectData }) {
  const [view, setView] = useState<'board' | 'list'>('board');
  const { tasks } = data;

  if (tasks.total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0', color: '#94a3b8' }}>
        <p style={{ fontSize: 44, margin: '0 0 12px' }}>📋</p>
        <p style={{ fontSize: 15 }}>No tasks have been added yet.</p>
      </div>
    );
  }

  const tasksByStatus: Record<string, PortalTask[]> = {};
  for (const s of TASK_STATUS_ORDER) tasksByStatus[s] = [];
  for (const t of tasks.items ?? []) {
    (tasksByStatus[t.status] ??= []).push(t);
  }

  return (
    <div>
      {/* View toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
          {tasks.total} task{tasks.total !== 1 ? 's' : ''} · {tasks.byStatus['DONE'] ?? 0} completed
        </p>
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 3, gap: 3 }}>
          {(['board', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              backgroundColor: view === v ? '#fff' : 'transparent',
              color: view === v ? '#0f172a' : '#64748b',
              boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}>
              {v === 'board' ? 'Board' : 'List'}
            </button>
          ))}
        </div>
      </div>

      {view === 'board' ? (
        <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, minWidth: 'min-content' }}>
            {TASK_STATUS_ORDER.map(status => {
              const col = tasksByStatus[status] ?? [];
              const color = TASK_STATUS_COLOR[status] ?? '#94a3b8';
              return (
                <div key={status} style={{
                  width: 240, flexShrink: 0, backgroundColor: '#f8fafc', borderRadius: 12,
                  padding: '12px 10px 14px', border: '1px solid #e2e8f0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, paddingLeft: 2 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', flex: 1 }}>{TASK_STATUS_LABEL[status]}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: color + '22', color, padding: '1px 7px', borderRadius: 99 }}>
                      {col.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 500, overflowY: 'auto' }}>
                    {col.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#cbd5e1', textAlign: 'center', padding: '14px 0', margin: 0 }}>Empty</p>
                    ) : col.map(t => <TaskCard key={t.id} task={t} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          {TASK_STATUS_ORDER.map(status => {
            const col = tasksByStatus[status] ?? [];
            if (col.length === 0) return null;
            return (
              <div key={status} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: TASK_STATUS_COLOR[status] ?? '#94a3b8' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{TASK_STATUS_LABEL[status]}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>({col.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {col.map(t => <TaskRow key={t.id} task={t} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: PortalTask }) {
  const pColor = PRIORITY_COLOR[task.priority] ?? '#64748b';
  const pBg = PRIORITY_BG[task.priority] ?? '#f1f5f9';
  const days = getDaysLeft(task.dueDate);
  const isOverdue = days !== null && days < 0;
  const isUrgent = days !== null && days >= 0 && days <= 2;
  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: 8, padding: '10px 12px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0',
    }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>
        {task.title}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, backgroundColor: pBg, color: pColor }}>
          {PRIORITY_LABEL[task.priority] ?? task.priority}
        </span>
        {task.dueDate && (
          <span style={{ fontSize: 11, color: isOverdue ? '#ef4444' : isUrgent ? '#d97706' : '#94a3b8' }}>
            📅 {fmtDateShort(task.dueDate)}
            {isOverdue && ' (late)'}
          </span>
        )}
      </div>
      {task.progress > 0 && (
        <div style={{ marginTop: 8, height: 3, backgroundColor: '#e2e8f0', borderRadius: 99 }}>
          <div style={{ height: '100%', width: `${task.progress}%`, backgroundColor: '#3b82f6', borderRadius: 99 }} />
        </div>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: PortalTask }) {
  const pColor = PRIORITY_COLOR[task.priority] ?? '#64748b';
  const pBg = PRIORITY_BG[task.priority] ?? '#f1f5f9';
  const days = getDaysLeft(task.dueDate);
  const isOverdue = days !== null && days < 0;
  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: 10, padding: '11px 14px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </p>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, backgroundColor: pBg, color: pColor, flexShrink: 0 }}>
        {PRIORITY_LABEL[task.priority] ?? task.priority}
      </span>
      {task.dueDate && (
        <span style={{ fontSize: 12, flexShrink: 0, minWidth: 72, textAlign: 'right', color: isOverdue ? '#ef4444' : '#64748b' }}>
          {isOverdue ? `${Math.abs(days!)}d late` : fmtDateShort(task.dueDate)}
        </span>
      )}
      {task.progress > 0 && (
        <div style={{ width: 56, flexShrink: 0 }}>
          <div style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 99 }}>
            <div style={{ height: '100%', width: `${task.progress}%`, backgroundColor: '#3b82f6', borderRadius: 99 }} />
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8', textAlign: 'right' }}>{task.progress}%</p>
        </div>
      )}
    </div>
  );
}

// ── Issues Tab ────────────────────────────────────────────────────────────────

function IssuesTab({ data }: { data: PortalProjectData }) {
  const { issues } = data;
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  if (issues.total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0', color: '#94a3b8' }}>
        <p style={{ fontSize: 44, margin: '0 0 12px' }}>✅</p>
        <p style={{ fontSize: 15 }}>No issues have been reported.</p>
      </div>
    );
  }

  const OPEN_STATUSES = new Set(['OPEN', 'IN_PROGRESS']);
  const filtered = (issues.items ?? []).filter(i => {
    if (filter === 'open') return OPEN_STATUSES.has(i.status);
    if (filter === 'resolved') return !OPEN_STATUSES.has(i.status);
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary card */}
      <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{issues.total}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Total Issues</div>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { label: 'Open', value: issues.open, color: '#f59e0b' },
              { label: 'Resolved', value: issues.resolved, color: '#22c55e' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
          {issues.bySeverity && Object.keys(issues.bySeverity).length > 0 && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                By Severity
              </p>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
                const count = issues.bySeverity?.[sev] ?? 0;
                if (count === 0) return null;
                return <HBar key={sev} label={SEVERITY_LABEL[sev]} count={count} total={issues.total} color={SEVERITY_COLOR[sev]} bg={SEVERITY_BG[sev]} />;
              })}
            </div>
          )}
        </div>
      </div>

      {/* Filter + list */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 3, gap: 3 }}>
          {(['all', 'open', 'resolved'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              backgroundColor: filter === f ? '#fff' : 'transparent',
              color: filter === f ? '#0f172a' : '#64748b',
              boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              textTransform: 'capitalize', transition: 'all 0.15s',
            }}>
              {f}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>{filtered.length} issue{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(issue => <IssueRow key={issue.id} issue={issue} />)}
        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0', margin: 0 }}>No issues in this category.</p>
        )}
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: PortalIssue }) {
  const sColor = SEVERITY_COLOR[issue.severity] ?? '#64748b';
  const sBg = SEVERITY_BG[issue.severity] ?? '#f1f5f9';
  const stColor = ISSUE_STATUS_COLOR[issue.status] ?? '#64748b';
  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: 10, padding: '14px 16px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0',
      borderLeft: `3px solid ${sColor}`,
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>{issue.title}</p>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#64748b' }}>{ISSUE_TYPE_LABEL[issue.type] ?? issue.type}</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, backgroundColor: sBg, color: sColor }}>
          {SEVERITY_LABEL[issue.severity] ?? issue.severity}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, backgroundColor: stColor + '1a', color: stColor }}>
          {ISSUE_STATUS_LABEL[issue.status] ?? issue.status}
        </span>
      </div>
    </div>
  );
}

// ── Team Tab ──────────────────────────────────────────────────────────────────

function TeamTab({ data }: { data: PortalProjectData }) {
  const { team } = data;
  if (team.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0', color: '#94a3b8' }}>
        <p style={{ fontSize: 44, margin: '0 0 12px' }}>👥</p>
        <p style={{ fontSize: 15 }}>No team members assigned yet.</p>
      </div>
    );
  }
  return (
    <div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>{team.length} member{team.length !== 1 ? 's' : ''} on this project</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {team.map((m, i) => (
          <div key={i} style={{
            backgroundColor: '#fff', borderRadius: 12, padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, fontWeight: 800, color: '#fff',
            }}>
              {m.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{m.displayName}</p>
              {m.role && <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>{m.role}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared style ──────────────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = {
  margin: '0 0 18px', fontSize: 12, fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'tasks' | 'issues' | 'team';
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'issues', label: 'Issues' },
  { id: 'team', label: 'Team' },
];

export default function ClientPortalPage() {
  const { token } = useParams() as { token: string };
  const [data, setData] = useState<PortalProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('overview');

  useEffect(() => {
    portalApi.getProjectData(token)
      .then(setData)
      .catch((err) => {
        const s = err?.response?.status;
        if (s === 404) setError('This project portal link is invalid or has been removed.');
        else if (s === 410) setError('This portal link has been disabled by the project team.');
        else setError('Unable to load project data. Please try again later.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: font }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p style={{ color: '#64748b', marginTop: 16 }}>Loading project data…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: font }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>
        <p style={{ fontSize: 52, margin: '0 0 16px' }}>⚠️</p>
        <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6 }}>{error}</p>
      </div>
    </div>
  );

  const { project } = data;
  const statusColor = PROJECT_STATUS_COLOR[project.status] ?? '#64748b';
  const doneCount = data.tasks.byStatus['DONE'] ?? 0;
  const pct = data.tasks.total > 0 ? Math.round((doneCount / data.tasks.total) * 100) : 0;

  const tabCounts: Partial<Record<TabId, number>> = {
    tasks: data.tasks.total,
    issues: data.issues.total,
    team: data.team.length,
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: font }}>

      {/* Top header */}
      <div style={{ backgroundColor: '#0f172a', padding: '13px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
            <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>ConstructIQ</span>
          </div>
          <span style={{ color: '#475569', fontSize: 12 }}>Client Portal · Read-only</span>
        </div>
      </div>

      {/* Project hero */}
      <div style={{ backgroundColor: '#fff', borderTop: `3px solid ${statusColor}`, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {project.code && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 99, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                    #{project.code}
                  </span>
                )}
                <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 99, backgroundColor: statusColor + '18', color: statusColor }}>
                  {PROJECT_STATUS_LABEL[project.status] ?? project.status}
                </span>
              </div>
              <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {project.name}
              </h1>
              {project.description && (
                <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: 14, lineHeight: 1.65, maxWidth: 580 }}>
                  {project.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {project.location && <span style={{ color: '#64748b', fontSize: 13 }}>📍 {project.location}</span>}
                {(project.startDate || project.endDate) && (
                  <span style={{ color: '#64748b', fontSize: 13 }}>
                    📅 {fmtDate(project.startDate)} — {project.endDate ? fmtDate(project.endDate) : 'Ongoing'}
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <DonutRing pct={pct} color={pct === 100 ? '#22c55e' : '#3b82f6'} />
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>{doneCount}/{data.tasks.total} tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky tab nav */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px', display: 'flex' }}>
          {TABS.map(({ id, label }) => {
            const count = tabCounts[id];
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: '13px 18px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent',
                fontSize: 14, fontWeight: active ? 700 : 500,
                color: active ? '#0f172a' : '#64748b',
                borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}>
                {label}
                {count !== undefined && count > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                    backgroundColor: active ? '#eff6ff' : '#f1f5f9',
                    color: active ? '#3b82f6' : '#94a3b8',
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 20px 56px' }}>
        {tab === 'overview' && <OverviewTab data={data} />}
        {tab === 'tasks' && <TasksTab data={data} />}
        {tab === 'issues' && <IssuesTab data={data} />}
        {tab === 'team' && <TeamTab data={data} />}
      </div>

      <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 12, padding: '14px 0 32px', borderTop: '1px solid #e2e8f0' }}>
        Powered by ConstructIQ · Read-only project tracking view
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
