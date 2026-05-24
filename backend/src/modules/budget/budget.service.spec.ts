import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { Budget } from './schemas/budget.schema';
import { BudgetLine } from './schemas/budget-line.schema';
import { Expense } from './schemas/expense.schema';

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
