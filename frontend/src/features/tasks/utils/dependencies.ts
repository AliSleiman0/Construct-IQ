import type { Task } from '@/types/task.types';

/**
 * Generic cycle guard for any entity with an id + a dependency-id list.
 * Would making `fromId` depend on `toId` create a cycle? It does if `toId`
 * already (transitively) depends on `fromId`. DFS over the dependency edges
 * (via `getDeps`) with a visited set so a pre-existing cyclic graph can't loop
 * forever. The backend does NOT enforce this, so this client guard is the only
 * protection. Used for tasks, phases, and milestones.
 */
export function wouldCreateCycleBy<T extends { id: string }>(
  items: T[],
  fromId: string,
  toId: string,
  getDeps: (item: T) => string[] | undefined,
): boolean {
  if (fromId === toId) return true;
  const byId = new Map(items.map((i) => [i.id, i]));
  const visited = new Set<string>();

  const dependsOn = (startId: string, targetId: string): boolean => {
    if (startId === targetId) return true;
    if (visited.has(startId)) return false;
    visited.add(startId);
    const node = byId.get(startId);
    for (const dep of (node && getDeps(node)) ?? []) {
      if (dependsOn(dep, targetId)) return true;
    }
    return false;
  };

  // Adding from→to is a cycle iff `to` can already reach `from`.
  return dependsOn(toId, fromId);
}

/** Task-specific wrapper — unchanged behavior. */
export function wouldCreateCycle(tasks: Task[], fromId: string, toId: string): boolean {
  return wouldCreateCycleBy(tasks, fromId, toId, (t) => t.dependsOnTaskIds);
}
