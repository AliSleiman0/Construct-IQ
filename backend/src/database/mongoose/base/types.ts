import { HydratedDocument } from 'mongoose';

/**
 * Helper for typing Mongoose hydrated documents with a string `_id`. Because
 * `cuidIdPlugin` overrides the default ObjectId, every model built in this app
 * has a string-typed primary key.
 *
 * Usage:
 *   export type UserDocument = CuidHydratedDocument<User>;
 */
export type CuidHydratedDocument<T> = HydratedDocument<T, Record<string, never>, { _id: string }>;
