'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { portalApi, PortalProjectData } from '@/lib/api/portal.api';

const STATUS_COLORS: Record<string, string> = {
  PLANNING: '#6366f1',
  ACTIVE: '#22c55e',
  ON_HOLD: '#f59e0b',
  COMPLETED: '#3b82f6',
  CANCELLED: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PREPARATION: 'In Preparation',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  REVIEW: 'In Review',
  DONE: 'Done',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: '#94a3b8',
  IN_PREPARATION: '#a78bfa',
  IN_PROGRESS: '#3b82f6',
  BLOCKED: '#ef4444',
  REVIEW: '#f59e0b',
  DONE: '#22c55e',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ClientPortalPage() {
  const { token } = useParams() as { token: string };
  const [data, setData] = useState<PortalProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    portalApi
      .getProjectData(token)
      .then(setData)
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 404) setError('This project portal link is invalid or has been removed.');
        else if (status === 410) setError('This portal link has been disabled by the project team.');
        else setError('Unable to load project data. Please try again later.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const doneCount = data?.tasks.byStatus['DONE'] ?? 0;
  const progressPct = data && data.tasks.total > 0
    ? Math.round((doneCount / data.tasks.total) * 100)
    : 0;

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.loadingWrapper}>
            <div style={styles.spinner} />
            <p style={{ color: '#64748b', marginTop: 16 }}>Loading project data…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.errorWrapper}>
            <p style={{ fontSize: 40 }}>⚠️</p>
            <p style={{ color: '#64748b', marginTop: 8, textAlign: 'center' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const { project, tasks, issues, team } = data;
  const statusColor = STATUS_COLORS[project.status] ?? '#64748b';

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoDot} />
            <span style={styles.logoText}>ConstructIQ</span>
          </div>
          <p style={styles.portalLabel}>Client Project Portal</p>
        </div>
      </div>

      <div style={styles.container}>
        {/* Project hero card */}
        <div style={{ ...styles.card, borderTop: `4px solid ${statusColor}` }}>
          <div style={styles.heroRow}>
            <div>
              <div style={styles.heroMeta}>
                {project.code && (
                  <span style={styles.codeBadge}>#{project.code}</span>
                )}
                <span style={{ ...styles.statusBadge, backgroundColor: `${statusColor}20`, color: statusColor }}>
                  {STATUS_LABELS[project.status] ?? project.status}
                </span>
              </div>
              <h1 style={styles.projectName}>{project.name}</h1>
              {project.description && (
                <p style={styles.description}>{project.description}</p>
              )}
              <div style={styles.metaRow}>
                {project.location && (
                  <span style={styles.metaItem}>📍 {project.location}</span>
                )}
                {(project.startDate || project.endDate) && (
                  <span style={styles.metaItem}>
                    📅 {formatDate(project.startDate)} — {project.endDate ? formatDate(project.endDate) : 'Ongoing'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {tasks.total > 0 && (
            <div style={styles.progressSection}>
              <div style={styles.progressHeader}>
                <span style={styles.progressLabel}>Overall Progress</span>
                <span style={styles.progressPct}>{progressPct}%</span>
              </div>
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progressPct}%`,
                    backgroundColor: progressPct === 100 ? '#22c55e' : '#3b82f6',
                  }}
                />
              </div>
              <p style={styles.progressSub}>
                {doneCount} of {tasks.total} tasks completed
              </p>
            </div>
          )}
        </div>

        <div style={styles.grid}>
          {/* Tasks breakdown */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Tasks</h2>
            {tasks.total === 0 ? (
              <p style={styles.emptyText}>No tasks added yet.</p>
            ) : (
              <>
                <div style={styles.statRow}>
                  <span style={styles.statBig}>{tasks.total}</span>
                  <span style={styles.statLabel}>Total Tasks</span>
                </div>
                <div style={styles.statusList}>
                  {Object.entries(tasks.byStatus).map(([status, count]) => (
                    <div key={status} style={styles.statusRow}>
                      <div style={styles.statusDotRow}>
                        <span
                          style={{
                            ...styles.dot,
                            backgroundColor: TASK_STATUS_COLORS[status] ?? '#94a3b8',
                          }}
                        />
                        <span style={styles.statusRowLabel}>
                          {TASK_STATUS_LABELS[status] ?? status}
                        </span>
                      </div>
                      <span style={styles.statusCount}>{count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Issues summary */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Issues</h2>
            {issues.total === 0 ? (
              <p style={styles.emptyText}>No issues reported.</p>
            ) : (
              <>
                <div style={styles.statRow}>
                  <span style={styles.statBig}>{issues.total}</span>
                  <span style={styles.statLabel}>Total Issues</span>
                </div>
                <div style={styles.issueStats}>
                  <div style={styles.issueStat}>
                    <span style={{ ...styles.issueCount, color: '#f59e0b' }}>{issues.open}</span>
                    <span style={styles.issueStatLabel}>Open</span>
                  </div>
                  <div style={styles.issueDivider} />
                  <div style={styles.issueStat}>
                    <span style={{ ...styles.issueCount, color: '#22c55e' }}>{issues.resolved}</span>
                    <span style={styles.issueStatLabel}>Resolved</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Team */}
        {team.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Project Team</h2>
            <div style={styles.teamGrid}>
              {team.map((member, i) => (
                <div key={i} style={styles.memberCard}>
                  <div style={styles.avatar}>
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={styles.memberName}>{member.displayName}</p>
                    {member.role && (
                      <p style={styles.memberRole}>{member.role}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p style={styles.footer}>
          Powered by ConstructIQ · This is a read-only project tracking view
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: '#0f172a',
    padding: '16px 24px',
  },
  headerInner: {
    maxWidth: 900,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoDot: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
  },
  logoText: {
    color: '#f1f5f9',
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: '-0.01em',
  },
  portalLabel: {
    color: '#94a3b8',
    fontSize: 13,
    margin: 0,
  },
  container: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '32px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 28,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  },
  heroRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroMeta: {
    display: 'flex',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap' as const,
  },
  codeBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  projectName: {
    margin: '0 0 8px',
    fontSize: 28,
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  description: {
    margin: '0 0 12px',
    color: '#64748b',
    fontSize: 15,
    lineHeight: 1.6,
  },
  metaRow: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap' as const,
  },
  metaItem: {
    color: '#64748b',
    fontSize: 14,
  },
  progressSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTop: '1px solid #f1f5f9',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
  },
  progressPct: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    transition: 'width 0.5s ease',
  },
  progressSub: {
    marginTop: 6,
    fontSize: 13,
    color: '#94a3b8',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
  },
  sectionTitle: {
    margin: '0 0 20px',
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    margin: 0,
  },
  statRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  statBig: {
    fontSize: 36,
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  statusList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusDotRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusRowLabel: {
    fontSize: 14,
    color: '#374151',
  },
  statusCount: {
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
  },
  issueStats: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    marginTop: 4,
  },
  issueStat: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
  },
  issueCount: {
    fontSize: 32,
    fontWeight: 800,
    lineHeight: 1,
  },
  issueStatLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  issueDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
  },
  teamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  },
  memberCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 700,
    flexShrink: 0,
  },
  memberName: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
  },
  memberRole: {
    margin: 0,
    fontSize: 12,
    color: '#64748b',
  },
  footer: {
    textAlign: 'center' as const,
    color: '#94a3b8',
    fontSize: 13,
    padding: '8px 0 16px',
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '48px 0',
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '3px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    animation: 'spin 0.8s linear infinite',
  },
  errorWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '48px 0',
  },
};
