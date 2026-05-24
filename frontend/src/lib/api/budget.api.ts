import { AxiosError } from 'axios';
import apiClient from './client';
import type {
  Budget,
  BudgetLine,
  CreateBudgetPayload,
  UpdateBudgetPayload,
  CreateBudgetLinePayload,
  CreateExpensePayload,
} from '@/types/budget.types';

type Raw = Record<string, any>;

// Budget docs are returned lean with `_id` (no `id` normalise in the service).
function idify<T extends Raw>(d: Raw): T {
  const { _id, id, ...rest } = d;
  return { ...(rest as T), id: (id ?? _id) as string };
}

function normaliseBudget(b: Raw): Budget {
  const budget = idify<Budget>(b);
  budget.lines = Array.isArray(b.lines) ? b.lines.map((l: Raw) => idify<BudgetLine>(l)) : [];
  return budget;
}

export const budgetApi = {
  // Returns null when the project has no budget yet (backend 404), so the UI can
  // show a "create budget" empty state instead of an error.
  getByProject: async (projectId: string): Promise<Budget | null> => {
    try {
      const res = await apiClient.get<Raw>('/budget', { params: { projectId } });
      return normaliseBudget(res.data);
    } catch (e) {
      if (e instanceof AxiosError && e.response?.status === 404) return null;
      throw e;
    }
  },

  create: async (payload: CreateBudgetPayload): Promise<Budget> => {
    const res = await apiClient.post<Raw>('/budget', payload);
    return normaliseBudget(res.data);
  },

  update: async (id: string, payload: UpdateBudgetPayload): Promise<Budget> => {
    const res = await apiClient.patch<Raw>(`/budget/${id}`, payload);
    return normaliseBudget(res.data);
  },

  addLine: async (budgetId: string, payload: CreateBudgetLinePayload): Promise<BudgetLine> => {
    const res = await apiClient.post<Raw>(`/budget/${budgetId}/lines`, payload);
    return idify<BudgetLine>(res.data);
  },

  removeLine: async (budgetId: string, lineId: string): Promise<void> => {
    await apiClient.delete(`/budget/${budgetId}/lines/${lineId}`);
  },

  addExpense: async (budgetId: string, payload: CreateExpensePayload): Promise<Raw> => {
    const res = await apiClient.post<Raw>(`/budget/${budgetId}/expenses`, payload);
    return idify(res.data);
  },
};
