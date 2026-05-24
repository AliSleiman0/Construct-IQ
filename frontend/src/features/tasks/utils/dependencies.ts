import type { Task } from '@/types/task.types';

/**
 * Would making `fromId` depend on `toId` create a cycle? It does if `toId`
 * already (transitively) depends on `fromId`. DFS over `dependsOnTaskIds` with
 * a visited set so a pre-existing cyclic graph can't loop forever. The backend
 * does NOT enforce this, so this client guard is the only protection.
 */
export function wouldCreateCycle(tasks: Task[], fromId: string, toId: string): boolean {
  if (fromId === toId) return true;
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();

  const dependsOn = (startId: string, targetId: string): boolean => {
    if (startId === targetId) return true;
    if (visited.has(startId)) return false;
    visited.add(startId);
    const node = byId.get(startId);
    for (const dep of node?.dependsOnTaskIds ?? []) {
      if (dependsOn(dep, targetId)) return true;
    }
    return false;
  };

  // Adding from→to is a cycle iff `to` can already reach `from`.
  return dependsOn(toId, fromId);
}
