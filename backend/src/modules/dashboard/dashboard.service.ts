import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOrgDashboard(organizationId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalProjectCount,
      activeProjectCount,
      teamMemberCount,
      projectStatusGroups,
      budgetAgg,
      expenseAgg,
      openIssueCount,
      issuePriorityGroups,
      reportsFiledLast30d,
      recentAuditLogs,
    ] = await Promise.all([
      // Total projects
      this.prisma.project.count({
        where: { organizationId, deletedAt: null },
      }),

      // Active projects
      this.prisma.project.count({
        where: { organizationId, status: 'ACTIVE', deletedAt: null },
      }),

      // Team members
      this.prisma.user.count({
        where: { organizationId, deletedAt: null, status: 'ACTIVE' },
      }),

      // Project status distribution
      this.prisma.project.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),

      // Total budget
      this.prisma.project.aggregate({
        where: { organizationId, deletedAt: null },
        _sum: { totalBudget: true },
      }),

      // Total expenses
      this.prisma.expense.aggregate({
        where: { organizationId },
        _sum: { amount: true },
      }),

      // Open issues
      this.prisma.issue.count({
        where: {
          organizationId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          deletedAt: null,
        },
      }),

      // Open issues by severity
      this.prisma.issue.groupBy({
        by: ['severity'],
        where: {
          organizationId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          deletedAt: null,
        },
        _count: true,
      }),

      // Reports filed in last 30 days
      this.prisma.dailyReport.count({
        where: {
          organizationId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),

      // Recent activity from audit logs
      this.prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          actor: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          project: {
            select: { id: true, code: true },
          },
        },
      }),
    ]);

    // Build status distribution map
    const statusMap: Record<string, number> = {
      PLANNING: 0,
      ACTIVE: 0,
      ON_HOLD: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const g of projectStatusGroups) {
      statusMap[g.status] = g._count;
    }

    // Build issue priority map
    const priorityMap: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    for (const g of issuePriorityGroups) {
      priorityMap[g.severity] = g._count;
    }

    // Build weekly report counts (last 4 weeks)
    const weeklyReportCounts = await this.getWeeklyReportCounts(organizationId);

    const budgetTotal = Number(budgetAgg._sum.totalBudget ?? 0);
    const budgetSpent = Number(expenseAgg._sum.amount ?? 0);

    // Map audit logs to recent activity
    const recentActivity = recentAuditLogs.map((log) => ({
      id: log.id,
      userName: log.actor
        ? `${log.actor.firstName} ${log.actor.lastName}`
        : 'System',
      avatarColor: this.getAvatarColor(log.actor?.firstName ?? 'S'),
      action: log.action,
      projectCode: log.project?.code ?? null,
      projectId: log.project?.id ?? null,
      detail: this.formatAuditDetail(log),
      createdAt: log.createdAt,
    }));

    return {
      activeProjectCount,
      totalProjectCount,
      teamMemberCount,
      budgetTotal,
      budgetSpent,
      budgetBurnPct: budgetTotal > 0 ? Math.round((budgetSpent / budgetTotal) * 100) : 0,
      openIssueCount,
      openIssuesByPriority: {
        critical: priorityMap.CRITICAL,
        high: priorityMap.HIGH,
        medium: priorityMap.MEDIUM,
        low: priorityMap.LOW,
      },
      projectStatusDistribution: {
        planning: statusMap.PLANNING,
        active: statusMap.ACTIVE,
        onHold: statusMap.ON_HOLD,
        completed: statusMap.COMPLETED,
        cancelled: statusMap.CANCELLED,
      },
      weeklyReportCounts,
      reportsFiledLast30d,
      recentActivity,
    };
  }

  private async getWeeklyReportCounts(organizationId: string) {
    const now = new Date();
    const weeks: { week: string; count: number }[] = [];

    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

      const count = await this.prisma.dailyReport.count({
        where: {
          organizationId,
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      });

      weeks.push({ week: `Week ${4 - i}`, count });
    }

    return weeks;
  }

  private getAvatarColor(name: string): string {
    const colors = ['#5d4037', '#ef6c00', '#1976d2', '#2e7d32', '#455a64', '#00897b'];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  }

  private formatAuditDetail(log: { action: string; entityType: string; metadata: any }): string {
    const meta = log.metadata as Record<string, any> | null;
    if (meta?.detail) return meta.detail;
    return `${log.action} ${log.entityType}`;
  }
}
