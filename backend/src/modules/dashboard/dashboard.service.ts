import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project } from '../projects/schemas/project.schema';
import { User } from '../users/schemas/user.schema';
import { Issue } from '../issues/schemas/issue.schema';
import { DailyReport } from '../reports/schemas/daily-report.schema';
import { AuditLog } from '../audit/schemas/audit-log.schema';
import { Expense } from '../budget/schemas/expense.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<any>,
    @InjectModel(User.name) private userModel: Model<any>,
    @InjectModel(Issue.name) private issueModel: Model<any>,
    @InjectModel(DailyReport.name) private dailyReportModel: Model<any>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<any>,
    @InjectModel(Expense.name) private expenseModel: Model<any>,
  ) {}

  async getOrgDashboard(organizationId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const orgFilter = { organizationId };

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
      this.projectModel.countDocuments(orgFilter),
      this.projectModel.countDocuments({ ...orgFilter, status: 'ACTIVE' }),
      this.userModel.countDocuments({ ...orgFilter, status: 'ACTIVE' }),
      this.projectModel.aggregate([
        { $match: orgFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.projectModel.aggregate([
        { $match: orgFilter },
        { $group: { _id: null, total: { $sum: '$totalBudget' } } },
      ]),
      this.expenseModel.aggregate([
        { $match: orgFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.issueModel.countDocuments({
        ...orgFilter,
        status: { $in: ['OPEN', 'IN_PROGRESS'] },
      }),
      this.issueModel.aggregate([
        { $match: { ...orgFilter, status: { $in: ['OPEN', 'IN_PROGRESS'] } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      this.dailyReportModel.countDocuments({
        ...orgFilter,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      this.auditLogModel
        .find(orgFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    // Build status distribution map
    const statusMap: Record<string, number> = {
      PLANNING: 0, ACTIVE: 0, ON_HOLD: 0, COMPLETED: 0, CANCELLED: 0,
    };
    for (const g of projectStatusGroups) {
      if (g._id in statusMap) statusMap[g._id] = g.count;
    }

    // Build issue priority map
    const priorityMap: Record<string, number> = {
      CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0,
    };
    for (const g of issuePriorityGroups) {
      if (g._id in priorityMap) priorityMap[g._id] = g.count;
    }

    // Resolve actor and project info for audit logs
    const actorIds = [...new Set(recentAuditLogs.map((l: any) => l.actorUserId).filter(Boolean))];
    const projectIds = [...new Set(recentAuditLogs.map((l: any) => l.projectId).filter(Boolean))];

    const [actors, projects] = await Promise.all([
      actorIds.length
        ? this.userModel.find({ _id: { $in: actorIds } }).select('firstName lastName avatarUrl').lean()
        : [],
      projectIds.length
        ? this.projectModel.find({ _id: { $in: projectIds } }).select('code').lean()
        : [],
    ]);

    const actorMap = new Map(actors.map((a: any) => [a._id, a]));
    const projectMap = new Map(projects.map((p: any) => [p._id, p]));

    const recentActivity = recentAuditLogs.map((log: any) => {
      const actor = actorMap.get(log.actorUserId);
      const project = projectMap.get(log.projectId);
      const firstName = (actor as any)?.firstName ?? 'System';
      return {
        id: log._id,
        userName: actor ? `${(actor as any).firstName} ${(actor as any).lastName}` : 'System',
        avatarColor: this.getAvatarColor(firstName),
        action: log.action,
        projectCode: (project as any)?.code ?? null,
        projectId: log.projectId ?? null,
        detail: this.formatAuditDetail(log),
        createdAt: log.createdAt,
      };
    });

    // Weekly report counts (last 4 weeks)
    const weeklyReportCounts = await this.getWeeklyReportCounts(organizationId);

    const budgetTotal = budgetAgg[0]?.total ?? 0;
    const budgetSpent = expenseAgg[0]?.total ?? 0;

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

      const count = await this.dailyReportModel.countDocuments({
        organizationId,
        createdAt: { $gte: weekStart, $lt: weekEnd },
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
