export interface BudgetLine {
  id: string;
  budgetId: string;
  category: string;
  description?: string | null;
  plannedAmount: number;
  /** Sum of expenses attributed to this line — computed by the backend. */
  spentAmount?: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  organizationId: string;
  projectId: string;
  totalAmount: number;
  currency: string;
  notes?: string | null;
  /** Present on GET /budget?projectId= (the aggregated read). */
  lines: BudgetLine[];
  /** Sum of all expenses against the budget — computed by the backend. */
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  budgetId: string;
  budgetLineId?: string | null;
  description: string;
  amount: number;
  currency: string;
  date: string;
  reference?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetPayload {
  projectId: string;
  totalAmount: number;
  currency?: string;
  notes?: string;
}

export interface UpdateBudgetPayload {
  totalAmount?: number;
  currency?: string;
  notes?: string;
}

export interface CreateBudgetLinePayload {
  category: string;
  plannedAmount: number;
  description?: string;
  notes?: string;
}

export interface CreateExpensePayload {
  description: string;
  amount: number;
  date: string;
  budgetLineId?: string;
  currency?: string;
  reference?: string;
  notes?: string;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;
