import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { Project } from '../projects/schemas/project.schema';
import { Task } from '../projects/schemas/task.schema';
import { User } from '../users/schemas/user.schema';
import { Issue } from '../issues/schemas/issue.schema';
import { DailyReport } from '../reports/schemas/daily-report.schema';
import { AuditLog } from '../audit/schemas/audit-log.schema';
import { Expense } from '../budget/schemas/expense.schema';

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
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: getModelToken(Task.name), useValue: taskModel },
        { provide: getModelToken(User.name), useValue: {} },
        { provide: getModelToken(Issue.name), useValue: issueModel },
        { provide: getModelToken(DailyReport.name), useValue: dailyReportModel },
        { provide: getModelToken(AuditLog.name), useValue: {} },
        { provide: getModelToken(Expense.name), useValue: {} },
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
