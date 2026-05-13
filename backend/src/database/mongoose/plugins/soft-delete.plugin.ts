import { Schema } from 'mongoose';

const FIND_HOOKS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'countDocuments',
  'updateOne',
  'updateMany',
] as const;

/**
 * Adds a `deletedAt: Date|null` field and auto-filters `deletedAt: null` on
 * read/update queries unless the caller passes `{ withDeleted: true }` in the
 * query options. To soft-delete: `model.updateOne({ _id }, { deletedAt: new Date() })`.
 * To bypass the filter: `model.find({...}).setOptions({ withDeleted: true })`.
 */
export function softDeletePlugin(schema: Schema): void {
  schema.add({
    deletedAt: { type: Date, default: null, index: true },
  });

  for (const hook of FIND_HOOKS) {
    schema.pre(hook as any, function (this: any, next: () => void) {
      const opts = (typeof this.getOptions === 'function' ? this.getOptions() : {}) ?? {};
      if (opts.withDeleted) return next();
      const filter = this.getFilter();
      if (!('deletedAt' in filter)) {
        this.where({ deletedAt: null });
      }
      next();
    });
  }
}
