import { describe, it, expect } from 'vitest';
import { wouldCreateCycle, wouldCreateCycleBy } from './dependencies';
import type { Task } from '@/types/task.types';

// Minimal Task — the guard only reads id + dependsOnTaskIds.
const task = (id: string, deps: string[]): Task =>
  ({ id, dependsOnTaskIds: deps } as unknown as Task);

describe('wouldCreateCycle (tasks)', () => {
  it('flags a direct back-edge (B already depends on A → A→B is a cycle)', () => {
    const tasks = [task('A', []), task('B', ['A'])];
    expect(wouldCreateCycle(tasks, 'A', 'B')).toBe(true);
  });

  it('flags self-dependency', () => {
    expect(wouldCreateCycle([task('A', [])], 'A', 'A')).toBe(true);
  });

  it('allows a non-cyclic edge', () => {
    const tasks = [task('A', []), task('B', ['A']), task('C', [])];
    expect(wouldCreateCycle(tasks, 'C', 'A')).toBe(false);
  });

  it('flags a transitive cycle (C→B→A, so A→C cycles)', () => {
    const tasks = [task('A', []), task('B', ['A']), task('C', ['B'])];
    expect(wouldCreateCycle(tasks, 'A', 'C')).toBe(true);
  });

  it('terminates on a pre-existing cyclic graph', () => {
    const tasks = [task('X', ['Y']), task('Y', ['X']), task('Z', [])];
    expect(wouldCreateCycle(tasks, 'Z', 'X')).toBe(false);
  });
});

describe('wouldCreateCycleBy (generic — phases/milestones)', () => {
  type Node = { id: string; deps: string[] };
  const getDeps = (n: Node) => n.deps;

  it('flags a cycle via a custom dependency accessor', () => {
    const nodes: Node[] = [{ id: 'P1', deps: [] }, { id: 'P2', deps: ['P1'] }];
    expect(wouldCreateCycleBy(nodes, 'P1', 'P2', getDeps)).toBe(true);
  });

  it('allows a non-cyclic edge', () => {
    const nodes: Node[] = [{ id: 'P1', deps: [] }, { id: 'P2', deps: [] }];
    expect(wouldCreateCycleBy(nodes, 'P2', 'P1', getDeps)).toBe(false);
  });
});
