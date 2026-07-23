import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { Organization } from '../organizations/schemas/organization.schema';
import { DashboardSnapshot } from './schemas/dashboard-snapshot.schema';
import { Project } from '../projects/schemas/project.schema';
import { Task } from '../projects/schemas/task.schema';
import { User } from '../users/schemas/user.schema';
import { Issue } from '../issues/schemas/issue.schema';
import { DailyReport } from '../reports/schemas/daily-report.schema';
import { AuditLog } from '../audit/schemas/audit-log.schema';
import { Expense } from '../budget/schemas/expense.schema';
import { Budget } from '../budget/schemas/budget.schema';
import { PurchaseOrder } from '../procurement/schemas/purchase-order.schema';
import { BoqItem } from '../surveyor/schemas/boq-item.schema';
import { Variation } from '../surveyor/schemas/variation.schema';
import { Valuation } from '../surveyor/schemas/valuation.schema';
import { Milestone } from '../projects/schemas/milestone.schema';
import { Unit } from '../units/schemas/unit.schema';
import { Payment } from '../units/schemas/payment.schema';

/** How long an org snapshot is served before a read recomputes + writes it back. */
const SNAPSHOT_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(Organization.name) private organizationModel: Model<any>,
    @InjectModel(DashboardSnapshot.name) private snapshotModel: Model<any>,
    @InjectModel(Project.name) private projectModel: Model<any>,
    @InjectModel(Task.name) private taskModel: Model<any>,
    @InjectModel(User.name) private userModel: Model<any>,
    @InjectModel(Issue.name) private issueModel: Model<any>,
    @InjectModel(DailyReport.name) private dailyReportModel: Model<any>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<any>,
    @InjectModel(Expense.name) private expenseModel: Model<any>,
    @InjectModel(Budget.name) private budgetModel: Model<any>,
    @InjectModel(PurchaseOrder.name) private purchaseOrderModel: Model<any>,
    @InjectModel(BoqItem.name) private boqModel: Model<any>,
    @InjectModel(Variation.name) private variationModel: Model<any>,
    @InjectModel(Valuation.name) private valuationModel: Model<any>,
    @InjectModel(Milestone.name) private milestoneModel: Model<any>,
    @InjectModel(Unit.name) private unitModel: Model<any>,
    @InjectModel(Payment.name) private paymentModel: Model<any>,
  ) {}

  /**
   * Dashboard for an external buyer — scoped to the unit they own rather than
   * to project membership, because a CLIENT belongs to no project. Returns null
   * fields (not an error) when they have no unit yet, so the page can render a
   * "browse the building" empty state.
   */
  async getClientDashboard(organizationId: string, userId: string) {
    const unit: any = await this.unitModel
      .findOne({ organizationId, buyerId: userId })
      .lean();

    if (!unit) {
      return {
        hasUnit: false,
        unitLabel: null,
        projectName: null,
        percentComplete: 0,
        paidToDate: 0,
        contractTotal: 0,
        nextMilestoneName: null,
        nextMilestoneDate: null,
        nextPaymentAmount: null,
        nextPaymentDate: null,
        milestoneProgress: [],
      };
    }

    const [project, milestones, payments] = await Promise.all([
      this.projectModel.findOne({ _id: unit.projectId }).select('name').lean(),
      this.milestoneModel
        .find({ projectId: unit.projectId, deletedAt: null })
        .sort({ targetDate: 1 })
        .lean(),
      this.paymentModel.find({ unitId: unit._id }).sort({ dueDate: 1 }).lean(),
    ]);

    // A PARTIAL installment contributes what was actually received.
    const paidToDate = payments.reduce(
      (sum: number, p: any) =>
        sum + (p.status === 'PAID' ? p.amountUsd : (p.paidAmountUsd ?? 0)),
      0,
    );
    const contractTotal = payments.reduce((sum: number, p: any) => sum + p.amountUsd, 0);

    const percentComplete =
      milestones.length === 0
        ? 0
        : Math.round(
            milestones.reduce((sum: number, m: any) => sum + (m.percentComplete ?? 0), 0) /
              milestones.length,
          );

    const nextMilestone =
      milestones.find((m: any) => m.status === 'IN_PROGRESS') ??
      milestones.find((m: any) => m.status === 'PENDING') ??
      null;

    const nextPayment =
      payments.find((p: any) => p.status !== 'PAID' && p.status !== 'CANCELLED') ?? null;

    return {
      hasUnit: true,
      unitLabel: unit.label,
      unitType: unit.type,
      bedrooms: unit.bedrooms,
      projectName: (project as any)?.name ?? null,
      percentComplete,
      paidToDate,
      contractTotal,
      nextMilestoneName: nextMilestone?.name ?? null,
      nextMilestoneDate: nextMilestone?.targetDate ?? null,
      nextPaymentAmount: nextPayment?.amountUsd ?? null,
      nextPaymentDate: nextPayment?.dueDate ?? null,
      milestoneProgress: milestones.map((m: any) => ({
        label: m.name,
        value: m.percentComplete ?? 0,
      })),
    };
  }

  /**
   * Org dashboard via a persisted snapshot (#36). Serves a fresh snapshot when
   * one exists within the TTL; otherwise computes live, writes the snapshot back,
   * and returns the fresh result. A cron keeps snapshots warm so most reads are
   * a single cheap document fetch instead of ~16 aggregations.
   */
  async getOrgDashboard(organizationId: string) {
    const snapshot: any = await this.snapshotModel.findOne({ organizationId }).lean();
    if (snapshot && Date.now() - new Date(snapshot.computedAt).getTime() < SNAPSHOT_TTL_MS) {
      return snapshot.payload;
    }
    return this.refreshOrgSnapshot(organizationId);
  }

  /** Recompute the org dashboard and upsert its snapshot; returns the fresh payload. */
  async refreshOrgSnapshot(organizationId: string) {
    const payload = await this.computeOrgDashboard(organizationId);
    await this.snapshotModel.updateOne(
      { organizationId },
      { $set: { payload, computedAt: new Date() } },
      { upsert: true },
    );
    return payload;
  }

  /** Daily-driver cron: keep every active org's snapshot warm. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async refreshOrgSnapshots(): Promise<{ refreshed: number }> {
    const orgs = await this.organizationModel.find({ isActive: true }).select('_id').lean();
    let refreshed = 0;
    for (const org of orgs as any[]) {
      try {
        await this.refreshOrgSnapshot(String(org._id));
        refreshed++;
      } catch (e) {
        this.logger.warn(`Dashboard snapshot refresh failed for org ${org._id}: ${e}`);
      }
    }
    return { refreshed };
  }

  private async computeOrgDashboard(organizationId: string) {
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

  /**
   * Dashboard for a Site Engineer — scoped to the projects they belong to, with
   * task metrics narrowed to tasks assigned to THEM and reports they filed
   * (a field role's "my work" view). Open-issue counts cover their projects so
   * they see what needs attention on site. Mirrors getPmDashboard's shape.
   */
  async getSiteEngDashboard(organizationId: string, userId: string) {
    const projects = await this.projectModel
      .find({ organizationId, 'members.userId': userId })
      .select('_id')
      .lean();
    const projectIds = projects.map((p: any) => p._id);

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
        myOpenTaskCount: 0,
        myTasksDueThisWeek: 0,
        openIssueCount: 0,
        escalatedIssueCount: 0,
        myReportsThisWeek: 0,
        taskThroughput: this.emptyThroughput(),
        myOpenTasksByStatus: emptyByStatus(),
      };
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const myTaskBase = { projectId: { $in: projectIds }, assignedToId: userId, deletedAt: null };

    const [
      myOpenTaskCount,
      myTasksDueThisWeek,
      myOpenByStatusGroups,
      myCompletedTasks,
      openIssueGroups,
      myReportsThisWeek,
    ] = await Promise.all([
      this.taskModel.countDocuments({ ...myTaskBase, status: { $ne: 'DONE' } }),
      this.taskModel.countDocuments({
        ...myTaskBase,
        status: { $ne: 'DONE' },
        dueDate: { $gte: now, $lte: weekAhead },
      }),
      this.taskModel.aggregate([
        { $match: { ...myTaskBase, status: { $ne: 'DONE' } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.taskModel
        .find({ ...myTaskBase, status: 'DONE', completedAt: { $gte: weekAgo } })
        .select('completedAt')
        .lean(),
      this.issueModel.aggregate([
        { $match: { projectId: { $in: projectIds }, deletedAt: null, status: { $in: ['OPEN', 'IN_PROGRESS'] } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      this.dailyReportModel.countDocuments({
        projectId: { $in: projectIds },
        createdById: userId,
        reportDate: { $gte: weekAgo },
      }),
    ]);

    const statusCounts = new Map<string, number>(
      myOpenByStatusGroups.map((g: any) => [g._id, g.count]),
    );
    const myOpenTasksByStatus = TASK_STATUSES.map((s) => ({
      label: s.label,
      value: statusCounts.get(s.id) ?? 0,
    }));

    let openIssueCount = 0;
    let escalatedIssueCount = 0;
    for (const g of openIssueGroups) {
      openIssueCount += g.count;
      if (g._id === 'HIGH' || g._id === 'CRITICAL') escalatedIssueCount += g.count;
    }

    const taskThroughput = this.buildThroughput(myCompletedTasks.map((t: any) => t.completedAt));

    return {
      projectCount: projects.length,
      myOpenTaskCount,
      myTasksDueThisWeek,
      openIssueCount,
      escalatedIssueCount,
      myReportsThisWeek,
      taskThroughput,
      myOpenTasksByStatus,
    };
  }

  /**
   * Dashboard for a Quantity Surveyor — a cost-domain rollup (BOQ, variations,
   * valuations, budget vs actual/committed) rather than the task-centric PM/Site
   * dashboards. Scoped exactly like the surveyor list endpoints: `orgWide` (held
   * by `manage:budget`) aggregates the whole org; otherwise it's narrowed to the
   * caller's member projects (a `read:budget`-only viewer), so the figures match
   * what the BOQ/Variations/Valuations pages show.
   */
  async getSurveyorDashboard(organizationId: string, userId: string, orgWide: boolean) {
    const VARIATION_STATUSES: { id: string; label: string }[] = [
      { id: 'PENDING', label: 'Pending' },
      { id: 'APPROVED', label: 'Approved' },
      { id: 'REJECTED', label: 'Rejected' },
    ];
    const VALUATION_STATUSES: { id: string; label: string }[] = [
      { id: 'DRAFT', label: 'Draft' },
      { id: 'SUBMITTED', label: 'Submitted' },
      { id: 'CERTIFIED', label: 'Certified' },
    ];

    const zeroed = () => ({
      projectCount: 0,
      boqItemCount: 0,
      boqTotalValue: 0,
      boqLockedCount: 0,
      pendingVariationCount: 0,
      pendingVariationImpact: 0,
      approvedVariationImpact: 0,
      variationsByStatus: VARIATION_STATUSES.map((s) => ({ label: s.label, value: 0 })),
      awaitingCertificationCount: 0,
      awaitingCertificationValue: 0,
      certifiedValue: 0,
      valuationValueByStatus: VALUATION_STATUSES.map((s) => ({ label: s.label, value: 0 })),
      budgetPlannedTotal: 0,
      budgetActualSpend: 0,
      committedCost: 0,
      budgetVariancePct: 0,
    });

    // Resolve the project scope. org-wide → match on organizationId only;
    // otherwise restrict to the caller's member projects (short-circuit empty).
    let projectCount: number;
    let projectMatch: Record<string, unknown>;
    if (orgWide) {
      projectCount = await this.projectModel.countDocuments({ organizationId });
      projectMatch = { organizationId };
    } else {
      const projects = await this.projectModel
        .find({ organizationId, 'members.userId': userId })
        .select('_id')
        .lean();
      const projectIds = projects.map((p: any) => p._id);
      if (projectIds.length === 0) return zeroed();
      projectCount = projects.length;
      projectMatch = { organizationId, projectId: { $in: projectIds } };
    }

    // Budgets first: their _ids are the only way to scope expenses (the expense
    // schema carries no projectId).
    const budgets = await this.budgetModel.find(projectMatch).select('_id totalAmount').lean();
    const budgetIds = budgets.map((b: any) => b._id);
    const budgetPlannedTotal = budgets.reduce((sum: number, b: any) => sum + (b.totalAmount ?? 0), 0);
    const expenseMatch = orgWide
      ? { organizationId }
      : { organizationId, budgetId: { $in: budgetIds } };

    // aggregate() bypasses the soft-delete query middleware → add deletedAt:null
    // explicitly for the soft-deleted collections (boq_items, variations, POs).
    const [boqAgg, variationGroups, valuationGroups, poAgg, expenseAgg] = await Promise.all([
      this.boqModel.aggregate([
        { $match: { ...projectMatch, deletedAt: null } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: '$totalAmount' },
            locked: { $sum: { $cond: ['$isLocked', 1, 0] } },
          },
        },
      ]),
      this.variationModel.aggregate([
        { $match: { ...projectMatch, deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 }, impact: { $sum: '$impactAmount' } } },
      ]),
      this.valuationModel.aggregate([
        { $match: projectMatch },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amountUsd' } } },
      ]),
      this.purchaseOrderModel.aggregate([
        { $match: { ...projectMatch, deletedAt: null, status: 'APPROVED' } },
        { $group: { _id: null, committed: { $sum: '$totalAmount' } } },
      ]),
      this.expenseModel.aggregate([
        { $match: expenseMatch },
        { $group: { _id: null, actual: { $sum: '$amount' } } },
      ]),
    ]);

    const boq = boqAgg[0] ?? { count: 0, total: 0, locked: 0 };

    // Variations: per-status count + impact (impact is signed; charts use counts).
    const varCount = new Map<string, number>(variationGroups.map((g: any) => [g._id, g.count]));
    const varImpact = new Map<string, number>(variationGroups.map((g: any) => [g._id, g.impact]));
    const variationsByStatus = VARIATION_STATUSES.map((s) => ({
      label: s.label,
      value: varCount.get(s.id) ?? 0,
    }));

    // Valuations: per-status count + summed amountUsd (always ≥0 → safe for bars).
    const valCount = new Map<string, number>(valuationGroups.map((g: any) => [g._id, g.count]));
    const valAmount = new Map<string, number>(valuationGroups.map((g: any) => [g._id, g.amount]));
    const valuationValueByStatus = VALUATION_STATUSES.map((s) => ({
      label: s.label,
      value: valAmount.get(s.id) ?? 0,
    }));

    const budgetActualSpend = expenseAgg[0]?.actual ?? 0;
    const budgetVariancePct =
      budgetPlannedTotal > 0
        ? ((budgetPlannedTotal - budgetActualSpend) / budgetPlannedTotal) * 100
        : 0;

    return {
      projectCount,
      boqItemCount: boq.count,
      boqTotalValue: boq.total,
      boqLockedCount: boq.locked,
      pendingVariationCount: varCount.get('PENDING') ?? 0,
      pendingVariationImpact: varImpact.get('PENDING') ?? 0,
      approvedVariationImpact: varImpact.get('APPROVED') ?? 0,
      variationsByStatus,
      awaitingCertificationCount: valCount.get('SUBMITTED') ?? 0,
      awaitingCertificationValue: valAmount.get('SUBMITTED') ?? 0,
      certifiedValue: valAmount.get('CERTIFIED') ?? 0,
      valuationValueByStatus,
      budgetPlannedTotal,
      budgetActualSpend,
      committedCost: poAgg[0]?.committed ?? 0,
      budgetVariancePct,
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
    // Run the four week-buckets in parallel (was a sequential await loop).
    const counts = await Promise.all(
      [3, 2, 1, 0].map((i) => {
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
        return this.dailyReportModel.countDocuments({
          organizationId,
          createdAt: { $gte: weekStart, $lt: weekEnd },
        });
      }),
    );
    return counts.map((count, idx) => ({ week: `Week ${idx + 1}`, count }));
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
