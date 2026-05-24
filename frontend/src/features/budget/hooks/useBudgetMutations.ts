import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetApi } from '@/lib/api/budget.api';
import type {
  CreateBudgetPayload,
  UpdateBudgetPayload,
  CreateBudgetLinePayload,
  CreateExpensePayload,
} from '@/types/budget.types';

function useInvalidateBudget() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['budget'] });
}

export function useCreateBudget() {
  const invalidate = useInvalidateBudget();
  return useMutation({
    mutationFn: (payload: CreateBudgetPayload) => budgetApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateBudget() {
  const invalidate = useInvalidateBudget();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBudgetPayload }) =>
      budgetApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useAddBudgetLine(budgetId: string) {
  const invalidate = useInvalidateBudget();
  return useMutation({
    mutationFn: (payload: CreateBudgetLinePayload) => budgetApi.addLine(budgetId, payload),
    onSuccess: invalidate,
  });
}

export function useRemoveBudgetLine(budgetId: string) {
  const invalidate = useInvalidateBudget();
  return useMutation({
    mutationFn: (lineId: string) => budgetApi.removeLine(budgetId, lineId),
    onSuccess: invalidate,
  });
}

export function useAddExpense(budgetId: string) {
  const invalidate = useInvalidateBudget();
  return useMutation({
    mutationFn: (payload: CreateExpensePayload) => budgetApi.addExpense(budgetId, payload),
    onSuccess: invalidate,
  });
}

export function useRemoveExpense(budgetId: string) {
  const invalidate = useInvalidateBudget();
  return useMutation({
    mutationFn: (expenseId: string) => budgetApi.removeExpense(budgetId, expenseId),
    onSuccess: invalidate,
  });
}
