'use client';

import { Box, Typography, Avatar, Divider, Skeleton } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';
import { useAuthStore } from '@/store/auth.store';
import { useOrgDashboard } from '@/features/dashboard/hooks/useOrgDashboard';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const QUICK_ACTIONS = [
  { icon: PersonAddIcon, bg: '#e0f2fe', fg: '#0288d1', label: 'Invite member', hint: 'Add a new user to your organization', href: '/admin/people' },
  { icon: SupportAgentIcon, bg: '#e0f2fe', fg: '#0288d1', label: 'Open a support ticket', hint: 'Get help from the ConstructIQ team', href: '/admin/support' },
  { icon: ReceiptLongIcon, bg: '#fff3e0', fg: '#e65100', label: 'View invoices', hint: 'View billing history', href: '/admin/billing' },
  { icon: CardMembershipIcon, bg: '#e0f2fe', fg: '#0288d1', label: 'Manage plan', hint: 'View subscription details', href: '/admin/subscription' },
];

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).join('').toUpperCase();
}

function formatMillions(n: number): string {
  if (n === 0) return '$0';
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

export default function OrgAdminDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useOrgDashboard();

  const firstName = user?.firstName ?? 'there';
  const orgName = user?.organization?.name ?? 'your organization';

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${firstName}. Here\u2019s a snapshot of ${orgName}.`}
      />

      {isLoading ? (
        <StatGrid>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={100} />
          ))}
        </StatGrid>
      ) : data ? (
        <>
          <StatGrid>
            <StatCard
              label="Active Projects"
              value={String(data.activeProjectCount)}
              hint={`${data.totalProjectCount} total`}
              icon={FolderOpenIcon}
              tone="primary"
            />
            <StatCard
              label="Team Members"
              value={String(data.teamMemberCount)}
              hint={`across ${data.activeProjectCount} active projects`}
              icon={PeopleIcon}
              tone="info"
            />
            <StatCard
              label="Budget Burn"
              value={`${data.budgetBurnPct}%`}
              hint={`${formatMillions(data.budgetSpent)} of ${formatMillions(data.budgetTotal)}`}
              icon={AccountBalanceWalletIcon}
              tone="warning"
            />
            <StatCard
              label="Open Issues"
              value={String(data.openIssueCount)}
              hint={`${data.openIssuesByPriority.high} high \u00B7 ${data.openIssuesByPriority.medium} medium`}
              icon={ReportProblemIcon}
              tone="error"
            />
          </StatGrid>

          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, mb: 2.5 }}>
            <DashboardPanel title="Project Status" subtitle="Distribution across all organization projects">
              <MiniBarChart
                data={[
                  { label: 'Planning', value: data.projectStatusDistribution.planning },
                  { label: 'Active', value: data.projectStatusDistribution.active },
                  { label: 'On Hold', value: data.projectStatusDistribution.onHold },
                  { label: 'Completed', value: data.projectStatusDistribution.completed },
                ]}
              />
            </DashboardPanel>
            <DashboardPanel title="Weekly Reports Filed" subtitle="Daily site reports submitted in the last 4 weeks">
              <MiniBarChart
                color="#16a34a"
                data={data.weeklyReportCounts.map((w) => ({ label: w.week, value: w.count }))}
              />
            </DashboardPanel>
          </Box>

          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
            <DashboardPanel title="Recent Activity" subtitle="Latest updates across your projects">
              <Box>
                {data.recentActivity.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No recent activity yet.
                  </Typography>
                ) : (
                  data.recentActivity.map((a, idx) => (
                    <Box key={a.id}>
                      {idx > 0 && <Divider sx={{ my: 1.5 }} />}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: a.avatarColor, width: 36, height: 36, fontSize: '0.8125rem', fontWeight: 600, mt: 0.25 }}>
                          {getInitials(a.userName)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                            <Typography component="span" variant="body2" fontWeight={600}>
                              {a.userName}
                            </Typography>{' '}
                            {a.action}
                            {a.projectCode && a.projectId && (
                              <>
                                {' on '}
                                <Link href={`/admin/projects/${a.projectId}`} style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>
                                  {a.projectCode}
                                </Link>
                              </>
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {a.detail}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', mt: 0.5 }}>
                          {dayjs(a.createdAt).fromNow()}
                        </Typography>
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            </DashboardPanel>

            <DashboardPanel title="Quick Actions">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {QUICK_ACTIONS.map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <Box
                      key={qa.label}
                      onClick={() => router.push(qa.href)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          bgcolor: qa.bg,
                          color: qa.fg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon sx={{ fontSize: 20 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {qa.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {qa.hint}
                        </Typography>
                      </Box>
                      <ChevronRightIcon sx={{ fontSize: 20, color: 'text.disabled', flexShrink: 0 }} />
                    </Box>
                  );
                })}
              </Box>
            </DashboardPanel>
          </Box>
        </>
      ) : null}
    </Box>
  );
}
