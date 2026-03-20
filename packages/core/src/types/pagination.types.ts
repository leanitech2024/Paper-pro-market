/**
 * Shared pagination types used by all service methods that return lists.
 * Use these instead of ad-hoc limit/offset parameters to keep APIs consistent.
 */

export interface PaginationParams {
    /** Maximum rows to return. Omit for unbounded (use sparingly on large tables). */
    limit?: number;
    /** Zero-based row offset. Defaults to 0. */
    offset?: number;
}

export interface PaginatedResult<T> {
    data: T[];
    /** Total matching rows in DB (before limit). */
    total: number;
    /** True when more rows exist beyond the current window. */
    hasMore: boolean;
}
