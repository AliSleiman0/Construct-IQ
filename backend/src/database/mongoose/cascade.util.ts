import { Connection } from 'mongoose';

export interface CascadeResult {
  model: string;
  modified: number;
}

/**
 * Soft-deletes every document scoped to a deleted parent, across all registered
 * models, without the caller having to inject each child model.
 *
 * For each registered model whose schema has BOTH the `scopeField` path (e.g.
 * `projectId` / `organizationId`) AND a `deletedAt` path (i.e. it uses
 * `softDeletePlugin`), this issues
 * `updateMany({ [scopeField]: scopeValue, deletedAt: null }, { deletedAt })`.
 *
 * Models without the soft-delete plugin are skipped — so collections that must
 * never be buried (e.g. `audit_logs`) are excluded automatically. Already
 * soft-deleted rows are skipped via the `deletedAt: null` guard, making the
 * cascade idempotent.
 */
export async function cascadeSoftDelete(
  connection: Connection,
  scopeField: string,
  scopeValue: string,
  now: Date,
): Promise<CascadeResult[]> {
  const results: CascadeResult[] = [];

  for (const name of connection.modelNames()) {
    const model = connection.model(name);
    const schema = model.schema;
    if (!schema.path(scopeField) || !schema.path('deletedAt')) continue;

    const res = await model.updateMany(
      { [scopeField]: scopeValue, deletedAt: null },
      { deletedAt: now },
    );
    results.push({ model: name, modified: res.modifiedCount ?? 0 });
  }

  return results;
}
