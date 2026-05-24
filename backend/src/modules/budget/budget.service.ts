import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Budget, BudgetDocument } from './schemas/budget.schema';
import { BudgetLine, BudgetLineDocument } from './schemas/budget-line.schema';
import { Expense, ExpenseDocument } from './schemas/expense.schema';
import { CreateBudgetDto, CreateBudgetLineDto, CreateExpenseDto } from './dto/create-budget.dto';
import { PartialType } from '@nestjs/mapped-types';

class UpdateBudgetDto extends PartialType(CreateBudgetDto) {}

@Injectable()
export class BudgetService {
  constructor(
    @InjectModel(Budget.name) private budgetModel: Model<BudgetDocument>,
    @InjectModel(BudgetLine.name) private lineModel: Model<BudgetLineDocument>,
    @InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>,
  ) {}

  async findByProject(projectId: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter: Record<string, unknown> = { projectId };
    if (!isSuperAdmin) filter.organizationId = organizationId;

    const budget = await this.budgetModel.findOne(filter).lean();
    if (!budget) throw new NotFoundException('Budget not found for this project');

    const [lines, expenses] = await Promise.all([
      this.lineModel.find({ budgetId: budget._id }).lean(),
      this.expenseModel.find({ budgetId: budget._id }).lean(),
    ]);

    const spentByLine = expenses.reduce<Record<string, number>>((acc, e) => {
      if (e.budgetLineId) {
        acc[e.budgetLineId] = (acc[e.budgetLineId] ?? 0) + e.amount;
      }
      return acc;
    }, {});

    return {
      ...budget,
      lines: lines.map((l) => ({ ...l, spentAmount: spentByLine[l._id] ?? 0 })),
      totalSpent: expenses.reduce((sum, e) => sum + e.amount, 0),
    };
  }

  async create(organizationId: string, dto: CreateBudgetDto): Promise<any> {
    const existing = await this.budgetModel.findOne({ projectId: dto.projectId });
    if (existing) throw new ConflictException('A budget already exists for this project');

    return this.budgetModel.create({
      organizationId,
      projectId: dto.projectId,
      totalAmount: dto.totalAmount,
      currency: dto.currency ?? 'USD',
      notes: dto.notes ?? null,
    });
  }

  async update(id: string, organizationId: string, dto: UpdateBudgetDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const budget = await this.budgetModel.findOne(filter);
    if (!budget) throw new NotFoundException('Budget not found');

    if (dto.totalAmount !== undefined) budget.totalAmount = dto.totalAmount;
    if (dto.currency !== undefined) budget.currency = dto.currency ?? 'USD';
    if (dto.notes !== undefined) budget.notes = dto.notes ?? null;

    await budget.save();
    return budget.toObject();
  }

  async addLine(budgetId: string, organizationId: string, dto: CreateBudgetLineDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: budgetId } : { _id: budgetId, organizationId };
    const budget = await this.budgetModel.findOne(filter).lean();
    if (!budget) throw new NotFoundException('Budget not found');

    return this.lineModel.create({
      budgetId,
      category: dto.category,
      description: dto.description ?? null,
      plannedAmount: dto.plannedAmount,
      notes: dto.notes ?? null,
    });
  }

  async removeLine(budgetId: string, lineId: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: budgetId } : { _id: budgetId, organizationId };
    const budget = await this.budgetModel.findOne(filter).lean();
    if (!budget) throw new NotFoundException('Budget not found');

    const line = await this.lineModel.findOneAndDelete({ _id: lineId, budgetId });
    if (!line) throw new NotFoundException('Budget line not found');
    return { message: 'Budget line deleted successfully' };
  }

  async addExpense(budgetId: string, organizationId: string, dto: CreateExpenseDto, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: budgetId } : { _id: budgetId, organizationId };
    const budget = await this.budgetModel.findOne(filter).lean();
    if (!budget) throw new NotFoundException('Budget not found');

    return this.expenseModel.create({
      organizationId,
      budgetId,
      budgetLineId: dto.budgetLineId ?? null,
      description: dto.description,
      amount: dto.amount,
      currency: dto.currency ?? 'USD',
      date: new Date(dto.date),
      reference: dto.reference ?? null,
      notes: dto.notes ?? null,
    });
  }

  async listExpenses(budgetId: string, organizationId: string, isSuperAdmin: boolean): Promise<any[]> {
    const filter = isSuperAdmin ? { _id: budgetId } : { _id: budgetId, organizationId };
    const budget = await this.budgetModel.findOne(filter).lean();
    if (!budget) throw new NotFoundException('Budget not found');

    const expenseFilter: Record<string, unknown> = { budgetId };
    if (!isSuperAdmin) expenseFilter.organizationId = organizationId;
    return this.expenseModel.find(expenseFilter).sort({ date: -1, createdAt: -1 }).lean();
  }

  async removeExpense(budgetId: string, expenseId: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: budgetId } : { _id: budgetId, organizationId };
    const budget = await this.budgetModel.findOne(filter).lean();
    if (!budget) throw new NotFoundException('Budget not found');

    // Scope the delete to this budget (and org, unless super admin) so a mismatched
    // id can never reach across budgets/tenants. findByProject recomputes spend from
    // the remaining expenses, so no extra recompute is needed here.
    const expenseFilter: Record<string, unknown> = { _id: expenseId, budgetId };
    if (!isSuperAdmin) expenseFilter.organizationId = organizationId;
    const expense = await this.expenseModel.findOneAndDelete(expenseFilter);
    if (!expense) throw new NotFoundException('Expense not found');
    return { message: 'Expense deleted successfully' };
  }
}
