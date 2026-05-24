import { useQuery } from '@tanstack/react-query';
import { budgetApi } from '@/lib/api/budget.api';
import { useAuthStore } from '@/store/auth.store';

export function useBudget(projectId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['budget', projectId],
    queryFn: () => budgetApi.getByProject(projectId!),
    enabled: isAuthenticated && !!projectId,
  });
}

export function useExpenses(budgetId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['budget', budgetId, 'expenses'],
    queryFn: () => budgetApi.listExpenses(budgetId!),
    enabled: isAuthenticated && !!budgetId,
  });
}
