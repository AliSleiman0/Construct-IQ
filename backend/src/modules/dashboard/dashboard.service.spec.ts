import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
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

/**
 * Unit tests for DashboardService.getPmDashboard — member-scoping, the
 * empty-projects shortcut, and the metric/series mapping. Models are mocked.
 */
describe('DashboardService — getPmDashboard', () => {
  let service: DashboardService;
  let projectModel: any;
  let taskModel: any;
  let issueModel: any;
  let dailyReportModel: any;

  const selectLean = (result: any) => ({ select: () => ({ lean: () => Promise.resolve(result) }) });

  beforeEach(async () => {
    projectModel = { find: jest.fn() };
    taskModel = { countDocuments: jest.fn(), aggregate: jest.fn(), find: jest.fn() };
    issueModel = { aggregate: jest.fn() };
    dailyReportModel = { countDocuments: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getModelToken(Organization.name), useValue: {} },
        { provide: getModelToken(DashboardSnapshot.name), useValue: {} },
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: getModelToken(Task.name), useValue: taskModel },
        { provide: getModelToken(User.name), useValue: {} },
        { provide: getModelToken(Issue.name), useValue: issueModel },
        { provide: getModelToken(DailyReport.name), useValue: dailyReportModel },
        { provide: getModelToken(AuditLog.name), useValue: {} },
        { provide: getModelToken(Expense.name), useValue: {} },
        { provide: getModelToken(Budget.name), useValue: {} },
        { provide: getModelToken(PurchaseOrder.name), useValue: {} },
        { provide: getModelToken(BoqItem.name), useValue: {} },
        { provide: getModelToken(Variation.name), useValue: {} },
        { provide: getModelToken(Valuation.name), useValue: {} },
        { provide: getModelToken(Milestone.name), useValue: {} },
        { provide: getModelToken(Unit.name), useValue: {} },
        { provide: getModelToken(Payment.name), useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(DashboardService);
  });

  it('scopes projects to the caller via members.userId', async () => {
    projectModel.find.mockReturnValue(selectLean([]));
    await service.getPmDashboard('org-1', 'u-1');
    expect(projectModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', 'members.userId': 'u-1' });
  });

  it('returns a zeroed shape (with full-length series) when the PM has no projects', async () => {
    projectModel.find.mockReturnValue(selectLean([]));
    const res = await service.getPmDashboard('org-1', 'u-1');
    expect(res.projectCount).toBe(0);
    expect(res.openTaskCount).toBe(0);
    expect(res.taskThroughput).toHaveLength(7);
    expect(res.openTasksByStatus.map((s) => s.label)).toEqual(['To Do', 'Prep', 'In Progress', 'Blocked', 'Review']);
    expect(res.openTasksByStatus.every((s) => s.value === 0)).toBe(true);
    expect(taskModel.countDocuments).not.toHaveBeenCalled();
  });

  it('maps counts, status breakdown, escalated issues, and throughput', async () => {
    projectModel.find.mockReturnValue(
      selectLean([{ _id: 'p1', status: 'ACTIVE' }, { _id: 'p2', status: 'PLANNING' }]),
    );
    taskModel.countDocuments
      .mockResolvedValueOnce(10) // openTaskCount
      .mockResolvedValueOnce(3); // tasksDueThisWeek
    taskModel.aggregate.mockResolvedValue([
      { _id: 'TODO', count: 4 },
      { _id: 'BLOCKED', count: 1 },
    ]);
    const today = new Date();
    taskModel.find.mockReturnValue(selectLean([{ completedAt: today }, { completedAt: today }]));
    issueModel.aggregate.mockResolvedValue([
      { _id: 'HIGH', count: 2 },
      { _id: 'LOW', count: 1 },
    ]);
    dailyReportModel.countDocuments.mockResolvedValue(5);

    const res = await service.getPmDashboard('org-1', 'u-1');

    expect(res.projectCount).toBe(2);
    expect(res.activeProjectCount).toBe(1);
    expect(res.openTaskCount).toBe(10);
    expect(res.tasksDueThisWeek).toBe(3);
    expect(res.openTasksByStatus).toEqual([
      { label: 'To Do', value: 4 },
      { label: 'Prep', value: 0 },
      { label: 'In Progress', value: 0 },
      { label: 'Blocked', value: 1 },
      { label: 'Review', value: 0 },
    ]);
    expect(res.openIssueCount).toBe(3);
    expect(res.escalatedIssueCount).toBe(2);
    expect(res.reportsThisWeek).toBe(5);
    expect(res.taskThroughput).toHaveLength(7);
    expect(res.taskThroughput.reduce((s, b) => s + b.value, 0)).toBe(2);
  });
});

describe('DashboardService — getSiteEngDashboard', () => {
  let service: DashboardService;
  let projectModel: any;
  let taskModel: any;
  let issueModel: any;
  let dailyReportModel: any;

  const selectLean = (result: any) => ({ select: () => ({ lean: () => Promise.resolve(result) }) });

  beforeEach(async () => {
    projectModel = { find: jest.fn() };
    taskModel = { countDocuments: jest.fn(), aggregate: jest.fn(), find: jest.fn() };
    issueModel = { aggregate: jest.fn() };
    dailyReportModel = { countDocuments: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getModelToken(Organization.name), useValue: {} },
        { provide: getModelToken(DashboardSnapshot.name), useValue: {} },
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: getModelToken(Task.name), useValue: taskModel },
        { provide: getModelToken(User.name), useValue: {} },
        { provide: getModelToken(Issue.name), useValue: issueModel },
        { provide: getModelToken(DailyReport.name), useValue: dailyReportModel },
        { provide: getModelToken(AuditLog.name), useValue: {} },
        { provide: getModelToken(Expense.name), useValue: {} },
        { provide: getModelToken(Budget.name), useValue: {} },
        { provide: getModelToken(PurchaseOrder.name), useValue: {} },
        { provide: getModelToken(BoqItem.name), useValue: {} },
        { provide: getModelToken(Variation.name), useValue: {} },
        { provide: getModelToken(Valuation.name), useValue: {} },
        { provide: getModelToken(Milestone.name), useValue: {} },
        { provide: getModelToken(Unit.name), useValue: {} },
        { provide: getModelToken(Payment.name), useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(DashboardService);
  });

  it('scopes projects to the caller via members.userId', async () => {
    projectModel.find.mockReturnValue(selectLean([]));
    await service.getSiteEngDashboard('org-1', 'eng-1');
    expect(projectModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', 'members.userId': 'eng-1' });
  });

  it('returns a zeroed "my work" shape when the engineer has no projects', async () => {
    projectModel.find.mockReturnValue(selectLean([]));
    const res = await service.getSiteEngDashboard('org-1', 'eng-1');
    expect(res.projectCount).toBe(0);
    expect(res.myOpenTaskCount).toBe(0);
    expect(res.myReportsThisWeek).toBe(0);
    expect(res.taskThroughput).toHaveLength(7);
    expect(res.myOpenTasksByStatus.map((s) => s.label)).toEqual(['To Do', 'Prep', 'In Progress', 'Blocked', 'Review']);
    expect(taskModel.countDocuments).not.toHaveBeenCalled();
  });

  it('narrows task metrics to assignedToId=me and reports to createdById=me', async () => {
    projectModel.find.mockReturnValue(selectLean([{ _id: 'p1' }, { _id: 'p2' }]));
    taskModel.countDocuments.mockResolvedValueOnce(4).mockResolvedValueOnce(1);
    taskModel.aggregate.mockResolvedValue([{ _id: 'IN_PROGRESS', count: 2 }]);
    taskModel.find.mockReturnValue(selectLean([{ completedAt: new Date() }]));
    issueModel.aggregate.mockResolvedValue([{ _id: 'CRITICAL', count: 1 }, { _id: 'LOW', count: 2 }]);
    dailyReportModel.countDocuments.mockResolvedValue(3);

    const res = await service.getSiteEngDashboard('org-1', 'eng-1');

    // Task queries are assignee-scoped to the caller.
    expect(taskModel.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ assignedToId: 'eng-1', projectId: { $in: ['p1', 'p2'] } }),
    );
    // Reports are scoped to the engineer's own filings.
    expect(dailyReportModel.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ createdById: 'eng-1', projectId: { $in: ['p1', 'p2'] } }),
    );
    expect(res.myOpenTaskCount).toBe(4);
    expect(res.myTasksDueThisWeek).toBe(1);
    expect(res.openIssueCount).toBe(3);
    expect(res.escalatedIssueCount).toBe(1);
    expect(res.myReportsThisWeek).toBe(3);
    expect(res.myOpenTasksByStatus.find((s) => s.label === 'In Progress')?.value).toBe(2);
  });
});

describe('DashboardService — getSurveyorDashboard', () => {
  let service: DashboardService;
  let projectModel: any;
  let budgetModel: any;
  let boqModel: any;
  let variationModel: any;
  let valuationModel: any;
  let purchaseOrderModel: any;
  let expenseModel: any;

  const selectLean = (result: any) => ({ select: () => ({ lean: () => Promise.resolve(result) }) });

  beforeEach(async () => {
    projectModel = { find: jest.fn(), countDocuments: jest.fn() };
    budgetModel = { find: jest.fn() };
    boqModel = { aggregate: jest.fn().mockResolvedValue([]) };
    variationModel = { aggregate: jest.fn().mockResolvedValue([]) };
    valuationModel = { aggregate: jest.fn().mockResolvedValue([]) };
    purchaseOrderModel = { aggregate: jest.fn().mockResolvedValue([]) };
    expenseModel = { aggregate: jest.fn().mockResolvedValue([]) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getModelToken(Organization.name), useValue: {} },
        { provide: getModelToken(DashboardSnapshot.name), useValue: {} },
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: getModelToken(Task.name), useValue: {} },
        { provide: getModelToken(User.name), useValue: {} },
        { provide: getModelToken(Issue.name), useValue: {} },
        { provide: getModelToken(DailyReport.name), useValue: {} },
        { provide: getModelToken(AuditLog.name), useValue: {} },
        { provide: getModelToken(Expense.name), useValue: expenseModel },
        { provide: getModelToken(Budget.name), useValue: budgetModel },
        { provide: getModelToken(PurchaseOrder.name), useValue: purchaseOrderModel },
        { provide: getModelToken(BoqItem.name), useValue: boqModel },
        { provide: getModelToken(Variation.name), useValue: variationModel },
        { provide: getModelToken(Valuation.name), useValue: valuationModel },
        { provide: getModelToken(Milestone.name), useValue: {} },
        { provide: getModelToken(Unit.name), useValue: {} },
        { provide: getModelToken(Payment.name), useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(DashboardService);
  });

  it('org-wide: matches on organizationId only (no project restriction) and sums expenses org-wide', async () => {
    projectModel.countDocuments.mockResolvedValue(3);
    budgetModel.find.mockReturnValue(selectLean([{ _id: 'b1', totalAmount: 1000 }]));

    await service.getSurveyorDashboard('org-1', 'qs-1', true);

    // Project-bound aggregates carry no projectId filter when org-wide.
    expect(boqModel.aggregate).toHaveBeenCalledWith([
      { $match: { organizationId: 'org-1', deletedAt: null } },
      expect.any(Object),
    ]);
    // Expenses are summed by organizationId (not budgetId) when org-wide.
    expect(expenseModel.aggregate).toHaveBeenCalledWith([
      { $match: { organizationId: 'org-1' } },
      expect.any(Object),
    ]);
    expect(projectModel.find).not.toHaveBeenCalled();
  });

  it('member-scoped: restricts to member projects and scopes expenses by their budget ids', async () => {
    projectModel.find.mockReturnValue(selectLean([{ _id: 'p1' }, { _id: 'p2' }]));
    budgetModel.find.mockReturnValue(selectLean([{ _id: 'b1', totalAmount: 500 }, { _id: 'b2', totalAmount: 250 }]));

    await service.getSurveyorDashboard('org-1', 'qs-1', false);

    expect(projectModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', 'members.userId': 'qs-1' });
    expect(budgetModel.find).toHaveBeenCalledWith({ organizationId: 'org-1', projectId: { $in: ['p1', 'p2'] } });
    expect(variationModel.aggregate).toHaveBeenCalledWith([
      { $match: { organizationId: 'org-1', projectId: { $in: ['p1', 'p2'] }, deletedAt: null } },
      expect.any(Object),
    ]);
    expect(expenseModel.aggregate).toHaveBeenCalledWith([
      { $match: { organizationId: 'org-1', budgetId: { $in: ['b1', 'b2'] } } },
      expect.any(Object),
    ]);
  });

  it('member-scoped with no projects: returns a zeroed payload and skips all aggregates', async () => {
    projectModel.find.mockReturnValue(selectLean([]));

    const res = await service.getSurveyorDashboard('org-1', 'qs-1', false);

    expect(res.projectCount).toBe(0);
    expect(res.boqTotalValue).toBe(0);
    expect(res.budgetVariancePct).toBe(0);
    expect(res.variationsByStatus.map((s) => s.label)).toEqual(['Pending', 'Approved', 'Rejected']);
    expect(res.valuationValueByStatus.map((s) => s.label)).toEqual(['Draft', 'Submitted', 'Certified']);
    expect(budgetModel.find).not.toHaveBeenCalled();
    expect(boqModel.aggregate).not.toHaveBeenCalled();
  });

  it('maps cost aggregates: BOQ totals, signed variation impact, valuation status sums, committed POs, variance', async () => {
    projectModel.countDocuments.mockResolvedValue(2);
    budgetModel.find.mockReturnValue(selectLean([{ _id: 'b1', totalAmount: 1000 }]));
    boqModel.aggregate.mockResolvedValue([{ _id: null, count: 14, total: 250000, locked: 1 }]);
    variationModel.aggregate.mockResolvedValue([
      { _id: 'PENDING', count: 3, impact: 24800 },
      { _id: 'APPROVED', count: 2, impact: -5000 },
    ]);
    valuationModel.aggregate.mockResolvedValue([
      { _id: 'SUBMITTED', count: 1, amount: 1420000 },
      { _id: 'CERTIFIED', count: 3, amount: 3470000 },
    ]);
    purchaseOrderModel.aggregate.mockResolvedValue([{ _id: null, committed: 60000 }]);
    expenseModel.aggregate.mockResolvedValue([{ _id: null, actual: 400 }]);

    const res = await service.getSurveyorDashboard('org-1', 'qs-1', true);

    expect(res.boqItemCount).toBe(14);
    expect(res.boqTotalValue).toBe(250000);
    expect(res.boqLockedCount).toBe(1);
    expect(res.pendingVariationCount).toBe(3);
    expect(res.pendingVariationImpact).toBe(24800);
    expect(res.approvedVariationImpact).toBe(-5000);
    expect(res.variationsByStatus).toEqual([
      { label: 'Pending', value: 3 },
      { label: 'Approved', value: 2 },
      { label: 'Rejected', value: 0 },
    ]);
    expect(res.awaitingCertificationCount).toBe(1);
    expect(res.awaitingCertificationValue).toBe(1420000);
    expect(res.certifiedValue).toBe(3470000);
    expect(res.valuationValueByStatus).toEqual([
      { label: 'Draft', value: 0 },
      { label: 'Submitted', value: 1420000 },
      { label: 'Certified', value: 3470000 },
    ]);
    expect(res.budgetPlannedTotal).toBe(1000);
    expect(res.budgetActualSpend).toBe(400);
    expect(res.committedCost).toBe(60000);
    // (1000 - 400) / 1000 * 100 = 60
    expect(res.budgetVariancePct).toBe(60);
  });
});

/**
 * #36 — getOrgDashboard is backed by a persisted snapshot: serve a fresh one,
 * else compute live + write back. A cron refreshes every active org.
 */
describe('DashboardService — org snapshot (#36)', () => {
  let service: DashboardService;
  let snapshotModel: any;
  let organizationModel: any;

  const allModelTokens = [
    Project, Task, User, Issue, DailyReport, AuditLog, Expense, Budget, PurchaseOrder, BoqItem, Variation, Valuation,
    Milestone, Unit, Payment,
  ];

  beforeEach(async () => {
    snapshotModel = { findOne: jest.fn(), updateOne: jest.fn().mockResolvedValue({}) };
    organizationModel = { find: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getModelToken(Organization.name), useValue: organizationModel },
        { provide: getModelToken(DashboardSnapshot.name), useValue: snapshotModel },
        ...allModelTokens.map((m) => ({ provide: getModelToken(m.name), useValue: {} })),
      ],
    }).compile();
    service = moduleRef.get(DashboardService);
  });

  it('returns a fresh snapshot without recomputing', async () => {
    const compute = jest.spyOn(service as any, 'computeOrgDashboard');
    snapshotModel.findOne.mockReturnValue({
      lean: () => Promise.resolve({ payload: { cached: true }, computedAt: new Date() }),
    });
    const res = await service.getOrgDashboard('org-1');
    expect(res).toEqual({ cached: true });
    expect(compute).not.toHaveBeenCalled();
    expect(snapshotModel.updateOne).not.toHaveBeenCalled();
  });

  it('computes + upserts when the snapshot is stale/absent', async () => {
    const compute = jest
      .spyOn(service as any, 'computeOrgDashboard')
      .mockResolvedValue({ fresh: true });
    snapshotModel.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    const res = await service.getOrgDashboard('org-1');
    expect(compute).toHaveBeenCalledWith('org-1');
    expect(res).toEqual({ fresh: true });
    expect(snapshotModel.updateOne).toHaveBeenCalledWith(
      { organizationId: 'org-1' },
      { $set: { payload: { fresh: true }, computedAt: expect.any(Date) } },
      { upsert: true },
    );
  });

  it('refreshOrgSnapshots recomputes for each active org', async () => {
    const refresh = jest.spyOn(service, 'refreshOrgSnapshot').mockResolvedValue({} as any);
    organizationModel.find.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{ _id: 'org-1' }, { _id: 'org-2' }]) }),
    });
    const res = await service.refreshOrgSnapshots();
    expect(res).toEqual({ refreshed: 2 });
    expect(refresh).toHaveBeenCalledWith('org-1');
    expect(refresh).toHaveBeenCalledWith('org-2');
  });
});
