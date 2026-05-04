import { Schema } from 'mongoose';
import { createId } from '@paralleldrive/cuid2';

/**
 * Replaces the default ObjectId-typed `_id` with a CUID2 string. Applied
 * globally via `mongoose.plugin()` so every schema (and embedded sub-schema
 * that does not opt out with `_id: false`) gets a stable, URL-safe string ID.
 *
 * Preserves the existing API contract: IDs were CUIDs under Prisma, and the
 * frontend route shapes assume string IDs of that form.
 */
export function cuidIdPlugin(schema: Schema) {
  schema.add({
    _id: { type: String, default: () => createId() },
  });
}
