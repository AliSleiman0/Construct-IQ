import { cascadeSoftDelete } from './cascade.util';

/**
 * cascadeSoftDelete sweeps registered models and soft-deletes only those whose
 * schema has BOTH the scope path and a `deletedAt` path — so soft-deletable,
 * scoped collections are caught and everything else (e.g. audit_logs) is skipped.
 */
describe('cascadeSoftDelete', () => {
  const makeModel = (paths: string[]) => ({
    schema: { path: (p: string) => (paths.includes(p) ? {} : undefined) },
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
  });

  it('updates only models with both the scope path and deletedAt', async () => {
    const child = makeModel(['projectId', 'deletedAt']);
    const auditLike = makeModel(['organizationId']); // no projectId, no deletedAt
    const rawScoped = makeModel(['projectId']); // scoped but not soft-deletable
    const models: Record<string, any> = { Child: child, AuditLog: auditLike, Raw: rawScoped };
    const connection: any = {
      modelNames: () => Object.keys(models),
      model: (name: string) => models[name],
    };
    const now = new Date('2026-06-27T00:00:00.000Z');

    const res = await cascadeSoftDelete(connection, 'projectId', 'p-1', now);

    expect(child.updateMany).toHaveBeenCalledWith({ projectId: 'p-1', deletedAt: null }, { deletedAt: now });
    expect(auditLike.updateMany).not.toHaveBeenCalled();
    expect(rawScoped.updateMany).not.toHaveBeenCalled();
    expect(res).toEqual([{ model: 'Child', modified: 2 }]);
  });

  it('honours an arbitrary scope field (organizationId)', async () => {
    const child = makeModel(['organizationId', 'deletedAt']);
    const connection: any = { modelNames: () => ['Child'], model: () => child };
    const now = new Date('2026-06-27T00:00:00.000Z');

    await cascadeSoftDelete(connection, 'organizationId', 'org-1', now);

    expect(child.updateMany).toHaveBeenCalledWith({ organizationId: 'org-1', deletedAt: null }, { deletedAt: now });
  });
});
