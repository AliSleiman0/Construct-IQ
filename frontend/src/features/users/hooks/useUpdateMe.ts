import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users.api';
import type { UpdateMyProfilePayload, User } from '@/types/user.types';

/** Mutates the authenticated user's profile via `PATCH /users/me`.
 *  Seeds the `['me']` cache with the server response so consumers paint
 *  the fresh values without waiting for the refetch. */
export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateMyProfilePayload) => usersApi.updateMe(payload),
    onSuccess: (user: User) => {
      queryClient.setQueryData(['me'], user);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
