import { BadRequestException } from '@nestjs/common';

/**
 * A state machine: for each status, the set of statuses it may legally move to.
 * Partial so terminal states can be omitted (treated as "no outgoing transitions").
 */
export type TransitionMap<T extends string> = Partial<Record<T, readonly T[]>>;

/**
 * Guard a status change against a state machine. Throws `BadRequestException`
 * when `to` is not a legal transition from `from`. Moving to the same status is
 * an allowed no-op (idempotent updates don't error).
 *
 * Shared by the entity update services so a guarded workflow (approve/certify/pay)
 * can't be bypassed by setting `status` directly through a generic PATCH.
 */
export function assertStatusTransition<T extends string>(
  entity: string,
  from: T,
  to: T,
  machine: TransitionMap<T>,
): void {
  if (from === to) return;
  const allowed = machine[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(`Invalid ${entity} status transition: ${from} → ${to}`);
  }
}
