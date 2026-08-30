/**
 * soft-delete.ts
 *
 * Shared utilities for the soft-delete pattern used across all Mongoose
 * repositories. Every repository that supports soft-delete should:
 *
 *  1. Include `SOFT_DELETE_FIELD` in its Mongoose schema (String, default: null, sparse index).
 *  2. Spread `ACTIVE_FILTER` into every read/update query to exclude deleted records.
 *  3. Use `buildSoftDeleteUpdate()` to produce the $set payload for softDelete().
 */

/** The field name stamped on a document when it is soft-deleted. */
export const SOFT_DELETE_FIELD = 'deleted_at' as const;

/**
 * Query filter that restricts results to **active** (non-deleted) documents.
 * Spread this into every find/findOne/findOneAndUpdate filter.
 *
 * @example
 *   Model.findOne({ id, ...ACTIVE_FILTER })
 */
export const ACTIVE_FILTER = { [SOFT_DELETE_FIELD]: null } as const;

/**
 * Produces the `$set` payload that stamps `deleted_at` with the current time.
 * Use inside a `Model.updateOne` or `Model.findOneAndUpdate` call.
 *
 * @example
 *   Model.updateOne({ id, ...ACTIVE_FILTER }, buildSoftDeleteUpdate())
 */
export function buildSoftDeleteUpdate(): { $set: Record<string, string> } {
  return { $set: { [SOFT_DELETE_FIELD]: new Date().toISOString() } };
}
