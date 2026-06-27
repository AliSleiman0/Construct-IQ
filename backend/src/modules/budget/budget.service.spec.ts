import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { Budget } from './schemas/budget.schema';
import { BudgetLine } from './schemas/budget-line.schema';
import { Expense } from './schemas/expense.schema';
import { PurchaseOrder } from '../procurement/schemas/purchase-order.schema';
import { AuditService } from '../audit/audit.service';

/**
 * Unit tests for BudgetService — focused on the expense list/delete additions
 * (org scoping, budget-scoping, not-found) plus the findByProject spend
 * aggregation. Mongoose models are fully mocked (no DB).
 */
describe('BudgetService', () => {
  let service: BudgetService;
  let budgetModel: any;
  let lineModel: any;
  let expenseModel: any;

  const leanOnce = (result: any) => ({ lean: () => Promise.resolve(result) });
  const sortLean = (result: any[]) => ({ sort: () => ({ lean: () => Promise.resolve(result) }) });

  beforeEach(async () => {
    budgetModel = { findOne: jest.fn() };
    lineModel = { find: jest.fn() };
    expenseModel = { find: jest.fn(), findOne: jest.fn(), findOneAndDelete: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BudgetService,
        { provide: getModelToken(Budget.name), useValue: budgetModel },
        { provide: getModelToken(BudgetLine.name), useValue: lineModel },
        { provide: getModelToken(Expense.name), useValue: expenseModel },
        { provide: getModelToken(PurchaseOrder.name), useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = moduleRef.get(BudgetService);
  });

  describe('findByProject', () => {
    it('aggregates spend per line + total from expenses', async () => {
      budgetModel.findOne.mockReturnValue(leanOnce({ _id: 'b-1', organizationId: 'org-1', projectId: 'p-1' }));
      lineModel.find.mockReturnValue(leanOnce([
        { _id: 'l-1', category: 'Labor', plannedAmount: 1000 },
        { _id: 'l-2', category: 'Materials', plannedAmount: 500 },
      ]));
      expenseModel.find.mockReturnValue(leanOnce([
        { _id: 'e-1', budgetLineId: 'l-1', amount: 150 },
        { _id: 'e-2', budgetLineId: 'l-1', amount: 50 },
        { _id: 'e-3', budgetLineId: 'l-2', amount: 200 },
      ]));

      const res = await service.findByProject('p-1', 'org-1', false);
      expect(res.lines.find((l: any) => l._id === 'l-1').spentAmount).toBe(200);
      expect(res.lines.find((l: any) => l._id === 'l-2').spentAmount).toBe(200);
      expect(res.totalSpent).toBe(400);
    });
  });

  describe('listExpenses', () => {
    it('throws NotFound when the budget is absent', async () => {
      budgetModel.findOne.mockReturnValue(leanOnce(null));
      await expect(service.listExpenses('b-1', 'org-1', false)).rejects.toBeInstanceOf(NotFoundException);
      expect(expenseModel.find).not.toHaveBeenCalled();
    });

    it('scopes by budgetId + organizationId for non-super-admins, sorted', async () => {
      budgetModel.findOne.mockReturnValue(leanOnce({ _id: 'b-1', organizationId: 'org-1' }));
      const sort = jest.fn().mockReturnValue({ lean: () => Promise.resolve([{ _id: 'e-1' }]) });
      expenseModel.find.mockReturnValue({ sort });

      const res = await service.listExpenses('b-1', 'org-1', false);
      expect(expenseModel.find).toHaveBeenCalledWith({ budgetId: 'b-1', organizationId: 'org-1' });
      expect(sort).toHaveBeenCalledWith({ date: -1, createdAt: -1 });
      expect(res).toEqual([{ _id: 'e-1' }]);
    });

    it('does NOT scope expenses by org for super admins', async () => {
      budgetModel.findOne.mockReturnValue(leanOnce({ _id: 'b-1' }));
      expenseModel.find.mockReturnValue(sortLean([]));
      await service.listExpenses('b-1', 'org-1', true);
      expect(expenseModel.find).toHaveBeenCalledWith({ budgetId: 'b-1' });
    });
  });

  describe('updateExpense', () => {
    it('throws NotFound when the expense does not match (cross-budget/cross-org)', async () => {
      budgetModel.findOne.mockReturnValue(leanOnce({ _id: 'b-1', organizationId: 'org-1' }));
      expenseModel.findOne.mockResolvedValue(null);
      await expect(
        service.updateExpense('b-1', 'e-x', 'org-1', { amount: 1 }, false),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('field-merges provided keys (re-points line + amount) and saves', async () => {
      budgetModel.findOne.mockReturnValue(leanOnce({ _id: 'b-1', organizationId: 'org-1' }));
      const doc: any = { budgetLineId: null, amount: 100, save: jest.fn(), toObject: () => doc };
      expenseModel.findOne.mockResolvedValue(doc);
      await service.updateExpense('b-1', 'e-1', 'org-1', { amount: 250, budgetLineId: 'l-1' }, false);
      expect(doc.amount).toBe(250);
      expect(doc.budgetLineId).toBe('l-1');
      expect(doc.save).toHaveBeenCalled();
      // The expense lookup is budget + org scoped.
      expect(expenseModel.findOne).toHaveBeenCalledWith({ _id: 'e-1', budgetId: 'b-1', organizationId: 'org-1' });
    });
  });

  describe('removeExpense', () => {
    it('throws NotFound when the budget is absent (never deletes)', async () => {
      budgetModel.findOne.mockReturnValue(leanOnce(null));
      await expect(service.removeExpense('b-1', 'e-1', 'org-1', false)).rejects.toBeInstanceOf(NotFoundException);
      expect(expenseModel.findOneAndDelete).not.toHaveBeenCalled();
    });

    it('deletes scoped to budget + org and returns a message', async () => {
      budgetModel.findOne.mockReturnValue(leanOnce({ _id: 'b-1', organizationId: 'org-1' }));
      expenseModel.findOneAndDelete.mockResolvedValue({ _id: 'e-1' });
      const res = await service.removeExpense('b-1', 'e-1', 'org-1', false);
      expect(expenseModel.findOneAndDelete).toHaveBeenCalledWith({ _id: 'e-1', budgetId: 'b-1', organizationId: 'org-1' });
      expect(res).toEqual({ message: 'Expense deleted successfully' });
    });

    it('throws NotFound when the expense does not match (cross-budget/cross-org)', async () => {
      budgetModel.findOne.mockReturnValue(leanOnce({ _id: 'b-1', organizationId: 'org-1' }));
      expenseModel.findOneAndDelete.mockResolvedValue(null);
      await expect(service.removeExpense('b-1', 'e-x', 'org-1', false)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

/**
 * #29 — budget LINE allocations may not exceed budget.totalAmount. (Expenses are
 * intentionally not capped — cost overruns must be recordable.)
 */
describe('BudgetService.addLine (#29 allocation cap)', () => {
  let service: BudgetService;
  let budgetModel: any;
  let lineModel: any;

  const leanOnce = (result: any) => ({ lean: () => Promise.resolve(result) });

  beforeEach(async () => {
    budgetModel = { findOne: jest.fn().mockReturnValue(leanOnce({ _id: 'b-1', organizationId: 'org-1', totalAmount: 1000 })) };
    lineModel = {
      aggregate: jest.fn().mockResolvedValue([{ total: 0 }]),
      create: jest.fn().mockImplementation((d) => Promise.resolve({ _id: 'l-1', ...d })),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        BudgetService,
        { provide: getModelToken(Budget.name), useValue: budgetModel },
        { provide: getModelToken(BudgetLine.name), useValue: lineModel },
        { provide: getModelToken(Expense.name), useValue: {} },
        { provide: getModelToken(PurchaseOrder.name), useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = moduleRef.get(BudgetService);
  });

  it('accepts a line whose allocation stays within the budget total', async () => {
    lineModel.aggregate.mockResolvedValue([{ total: 700 }]); // 700 + 300 = 1000 (ok)
    await service.addLine('b-1', 'org-1', { category: 'Labor', plannedAmount: 300 } as any, false);
    expect(lineModel.create).toHaveBeenCalled();
  });

  it('rejects a line whose allocation would exceed the budget total', async () => {
    lineModel.aggregate.mockResolvedValue([{ total: 900 }]); // 900 + 200 = 1100 > 1000
    await expect(
      service.addLine('b-1', 'org-1', { category: 'Materials', plannedAmount: 200 } as any, false),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(lineModel.create).not.toHaveBeenCalled();
  });
});

/**
 * #31 — an expense's optional budgetLineId must belong to the SAME budget, so a
 * line from another budget (or tenant) can't be linked. Line lookup is mocked.
 */
describe('BudgetService.addExpense (#31 line-ownership)', () => {
  let service: BudgetService;
  let budgetModel: any;
  let lineModel: any;
  let expenseModel: any;

  const leanOnce = (result: any) => ({ lean: () => Promise.resolve(result) });
  const expenseDto = (over: any = {}) => ({ description: 'Cement', amount: 100, date: '2026-06-27', ...over });

  beforeEach(async () => {
    budgetModel = { findOne: jest.fn().mockReturnValue(leanOnce({ _id: 'b-1', organizationId: 'org-1' })) };
    lineModel = { findOne: jest.fn() };
    expenseModel = { create: jest.fn().mockImplementation((d) => Promise.resolve({ _id: 'e-1', ...d })) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        BudgetService,
        { provide: getModelToken(Budget.name), useValue: budgetModel },
        { provide: getModelToken(BudgetLine.name), useValue: lineModel },
        { provide: getModelToken(Expense.name), useValue: expenseModel },
        { provide: getModelToken(PurchaseOrder.name), useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = moduleRef.get(BudgetService);
  });

  it('rejects a budgetLineId that belongs to another budget', async () => {
    lineModel.findOne.mockReturnValue(leanOnce(null)); // no line with {_id, budgetId: 'b-1'}
    await expect(
      service.addExpense('b-1', 'org-1', expenseDto({ budgetLineId: 'l-foreign' }) as any, false),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(lineModel.findOne).toHaveBeenCalledWith({ _id: 'l-foreign', budgetId: 'b-1' });
    expect(expenseModel.create).not.toHaveBeenCalled();
  });

  it('creates the expense when the line belongs to this budget', async () => {
    lineModel.findOne.mockReturnValue(leanOnce({ _id: 'l-1', budgetId: 'b-1' }));
    await service.addExpense('b-1', 'org-1', expenseDto({ budgetLineId: 'l-1' }) as any, false);
    expect(expenseModel.create).toHaveBeenCalledTimes(1);
    expect(expenseModel.create.mock.calls[0][0].budgetLineId).toBe('l-1');
  });

  it('creates the expense without a line lookup when budgetLineId is omitted', async () => {
    await service.addExpense('b-1', 'org-1', expenseDto() as any, false);
    expect(lineModel.findOne).not.toHaveBeenCalled();
    expect(expenseModel.create).toHaveBeenCalledTimes(1);
    expect(expenseModel.create.mock.calls[0][0].budgetLineId).toBeNull();
  });
});

/**
 * #34 — referential integrity on deletes: removeLine is blocked when POs/expenses
 * reference the line; deleteBudget cascade soft-deletes its lines + expenses.
 */
describe('BudgetService delete cascades & guards (#34)', () => {
  let service: BudgetService;
  let budgetModel: any;
  let lineModel: any;
  let expenseModel: any;
  let poModel: any;
  let auditLog: jest.Mock;

  const leanOnce = (result: any) => ({ lean: () => Promise.resolve(result) });

  beforeEach(async () => {
    budgetModel = { findOne: jest.fn(), updateOne: jest.fn().mockResolvedValue({}) };
    lineModel = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
      countDocuments: jest.fn(),
    };
    expenseModel = {
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 3 }),
      countDocuments: jest.fn(),
    };
    poModel = { countDocuments: jest.fn() };
    auditLog = jest.fn().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        BudgetService,
        { provide: getModelToken(Budget.name), useValue: budgetModel },
        { provide: getModelToken(BudgetLine.name), useValue: lineModel },
        { provide: getModelToken(Expense.name), useValue: expenseModel },
        { provide: getModelToken(PurchaseOrder.name), useValue: poModel },
        { provide: AuditService, useValue: { log: auditLog } },
      ],
    }).compile();
    service = moduleRef.get(BudgetService);
  });

  describe('removeLine', () => {
    it('blocks deletion when a PO or expense references the line', async () => {
      budgetModel.findOne.mockReturnValue(leanOnce({ _id: 'b-1', organizationId: 'org-1' }));
      lineModel.findOne.mockResolvedValue({ _id: 'l-1' });
      poModel.countDocuments.mockResolvedValue(1);
      expenseModel.countDocuments.mockResolvedValue(0);

      await expect(service.removeLine('b-1', 'l-1', 'org-1', false)).rejects.toBeInstanceOf(ConflictException);
      expect(lineModel.updateOne).not.toHaveBeenCalled();
    });

    it('soft-deletes the line when nothing references it', async () => {
      budgetModel.findOne.mockReturnValue(leanOnce({ _id: 'b-1', organizationId: 'org-1' }));
      lineModel.findOne.mockResolvedValue({ _id: 'l-1' });
      poModel.countDocuments.mockResolvedValue(0);
      expenseModel.countDocuments.mockResolvedValue(0);

      const res = await service.removeLine('b-1', 'l-1', 'org-1', false);
      expect(lineModel.updateOne).toHaveBeenCalledWith({ _id: 'l-1' }, { deletedAt: expect.any(Date) });
      expect(res).toEqual({ message: 'Budget line deleted successfully' });
    });
  });

  describe('deleteBudget', () => {
    it('throws NotFound when the budget is absent (no cascade)', async () => {
      budgetModel.findOne.mockResolvedValue(null);
      await expect(service.deleteBudget('b-x', 'org-1', false)).rejects.toBeInstanceOf(NotFoundException);
      expect(lineModel.updateMany).not.toHaveBeenCalled();
      expect(expenseModel.updateMany).not.toHaveBeenCalled();
    });

    it('soft-deletes the budget and cascades to its lines + expenses, then audits', async () => {
      budgetModel.findOne.mockResolvedValue({ _id: 'b-1', organizationId: 'org-1', projectId: 'p-1' });
      const res = await service.deleteBudget('b-1', 'org-1', false, 'actor-1');

      expect(budgetModel.updateOne).toHaveBeenCalledWith({ _id: 'b-1' }, { deletedAt: expect.any(Date) });
      expect(lineModel.updateMany).toHaveBeenCalledWith({ budgetId: 'b-1', deletedAt: null }, { deletedAt: expect.any(Date) });
      expect(expenseModel.updateMany).toHaveBeenCalledWith({ budgetId: 'b-1', deletedAt: null }, { deletedAt: expect.any(Date) });
      expect(auditLog).toHaveBeenCalledTimes(1);
      expect(auditLog.mock.calls[0][0]).toMatchObject({ action: 'DELETE', entityType: 'BUDGET', entityId: 'b-1', actorUserId: 'actor-1' });
      expect(res).toEqual({ message: 'Budget deleted successfully' });
    });
  });
});
