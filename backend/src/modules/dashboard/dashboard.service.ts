import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project } from '../projects/schemas/project.schema';
import { Task } from '../projects/schemas/task.schema';
import { User } from '../users/schemas/user.schema';
import { Issue } from '../issues/schemas/issue.schema';
import { DailyReport } from '../reports/schemas/daily-report.schema';
import { AuditLog } from '../audit/schemas/audit-log.schema';
import { Expense } from '../budget/schemas/expense.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<any>,
    @InjectModel(Task.name) private taskModel: Model<any>,
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

  /**
   * Dashboard for a Project Manager — scoped to the projects they belong to
   * (mirrors ProjectsService.findAll member-scoping). Returns the metrics the
   * /pm/dashboard widgets render: stat-card counts + a 7-day task-throughput
   * series + an open-tasks-by-status breakdown.
   */
  async getPmDashboard(organizationId: string, userId: string) {
    const projects = await this.projectModel
      .find({ organizationId, 'members.userId': userId })
      .select('_id status')
      .lean();
    const projectIds = projects.map((p: any) => p._id);
    const activeProjectCount = projects.filter((p: any) => p.status === 'ACTIVE').length;

    const TASK_STATUSES: { id: string; label: string }[] = [
      { id: 'TODO', label: 'To Do' },
      { id: 'IN_PREPARATION', label: 'Prep' },
      { id: 'IN_PROGRESS', label: 'In Progress' },
      { id: 'BLOCKED', label: 'Blocked' },
      { id: 'REVIEW', label: 'Review' },
    ];
    const emptyByStatus = () => TASK_STATUSES.map((s) => ({ label: s.label, value: 0 }));

    if (projectIds.length === 0) {
      return {
        projectCount: 0,
        activeProjectCount: 0,
        openTaskCount: 0,
        tasksDueThisWeek: 0,
        openIssueCount: 0,
        escalatedIssueCount: 0,
        reportsThisWeek: 0,
        taskThroughput: this.emptyThroughput(),
        openTasksByStatus: emptyByStatus(),
      };
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const taskBase = { projectId: { $in: projectIds }, deletedAt: null };

    const [
      openTaskCount,
      tasksDueThisWeek,
      openTasksByStatusGroups,
      completedTasks,
      openIssueGroups,
      reportsThisWeek,
    ] = await Promise.all([
      this.taskModel.countDocuments({ ...taskBase, status: { $ne: 'DONE' } }),
      this.taskModel.countDocuments({
        ...taskBase,
        status: { $ne: 'DONE' },
        dueDate: { $gte: now, $lte: weekAhead },
      }),
      this.taskModel.aggregate([
        { $match: { ...taskBase, status: { $ne: 'DONE' } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.taskModel
        .find({ ...taskBase, status: 'DONE', completedAt: { $gte: weekAgo } })
        .select('completedAt')
        .lean(),
      this.issueModel.aggregate([
        { $match: { projectId: { $in: projectIds }, deletedAt: null, status: { $in: ['OPEN', 'IN_PROGRESS'] } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      this.dailyReportModel.countDocuments({
        projectId: { $in: projectIds },
        reportDate: { $gte: weekAgo },
      }),
    ]);

    // Open tasks by status (fixed order, zero-filled).
    const statusCounts = new Map<string, number>(
      openTasksByStatusGroups.map((g: any) => [g._id, g.count]),
    );
    const openTasksByStatus = TASK_STATUSES.map((s) => ({
      label: s.label,
      value: statusCounts.get(s.id) ?? 0,
    }));

    // Open issues: total + escalated (HIGH/CRITICAL).
    let openIssueCount = 0;
    let escalatedIssueCount = 0;
    for (const g of openIssueGroups) {
      openIssueCount += g.count;
      if (g._id === 'HIGH' || g._id === 'CRITICAL') escalatedIssueCount += g.count;
    }

    // Task throughput — completed per day over the last 7 days.
    const taskThroughput = this.buildThroughput(completedTasks.map((t: any) => t.completedAt));

    return {
      projectCount: projects.length,
      activeProjectCount,
      openTaskCount,
      tasksDueThisWeek,
      openIssueCount,
      escalatedIssueCount,
      reportsThisWeek,
      taskThroughput,
      openTasksByStatus,
    };
  }

  private buildThroughput(completedAts: (Date | string | null)[]): { label: string; value: number }[] {
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const buckets: { label: string; key: string; value: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      buckets.push({ label: days[d.getDay()], key: d.toISOString().slice(0, 10), value: 0 });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const c of completedAts) {
      if (!c) continue;
      const key = new Date(c).toISOString().slice(0, 10);
      const b = byKey.get(key);
      if (b) b.value += 1;
    }
    return buckets.map((b) => ({ label: b.label, value: b.value }));
  }

  private emptyThroughput(): { label: string; value: number }[] {
    return this.buildThroughput([]);
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
