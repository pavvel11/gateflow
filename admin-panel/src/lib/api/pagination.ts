/**
 * Cursor-based Pagination Utilities for /api/v1/*
 *
 * Cursor pagination is more scalable than offset pagination:
 * - Consistent results even when data changes
 * - Better performance for large datasets
 * - Works well with real-time data
 */

import { CursorPagination } from './types';

// Default and max limits
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Cursor format: base64 encoded JSON with field value and direction
interface CursorData {
  field: string;      // Field used for ordering (e.g., 'created_at')
  value: string;      // Value at cursor position
  id: string;         // ID for tie-breaking
  direction: 'asc' | 'desc';
}

/**
 * Encode cursor data to string
 */
export function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

/**
 * Decode cursor string to data
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
    const data = JSON.parse(decoded);

    // Validate cursor structure
    if (
      typeof data.field !== 'string' ||
      typeof data.value !== 'string' ||
      typeof data.id !== 'string' ||
      (data.direction !== 'asc' && data.direction !== 'desc')
    ) {
      return null;
    }

    return data as CursorData;
  } catch {
    return null;
  }
}

/**
 * Parse and validate limit parameter
 */
export function parseLimit(limitParam: string | null): number {
  if (!limitParam) return DEFAULT_LIMIT;

  const limit = parseInt(limitParam, 10);
  if (isNaN(limit) || limit < 1) return DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) return MAX_LIMIT;

  return limit;
}

/**
 * Create pagination response from query results
 */
export function createPaginationResponse<T extends { id: string }>(
  items: T[],
  limit: number,
  orderField: string,
  orderDirection: 'asc' | 'desc',
  currentCursor: string | null
): { items: T[]; pagination: CursorPagination } {
  // We fetch limit + 1 to check if there's more
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;

  let nextCursor: string | null = null;

  if (hasMore && resultItems.length > 0) {
    const lastItem = resultItems[resultItems.length - 1];
    const fieldValue = (lastItem as Record<string, unknown>)[orderField];

    nextCursor = encodeCursor({
      field: orderField,
      value: String(fieldValue),
      id: lastItem.id,
      direction: orderDirection,
    });
  }

  return {
    items: resultItems,
    pagination: {
      cursor: currentCursor,
      next_cursor: nextCursor,
      has_more: hasMore,
      limit,
    },
  };
}

/**
 * Apply cursor to Supabase query
 *
 * For desc order: get items WHERE (field, id) < (cursor_value, cursor_id)
 * For asc order: get items WHERE (field, id) > (cursor_value, cursor_id)
 */
export function applyCursorToQuery(
  query: any, // Supabase query builder
  cursor: string | null,
  orderField: string,
  orderDirection: 'asc' | 'desc'
): any {
  if (!cursor) {
    return query;
  }

  const cursorData = decodeCursor(cursor);
  if (!cursorData) {
    // Invalid cursor, ignore it
    return query;
  }

  // Validate cursor matches current query parameters
  if (cursorData.field !== orderField || cursorData.direction !== orderDirection) {
    // Cursor doesn't match current sort, ignore it
    return query;
  }

  // Apply cursor filter using compound comparison
  // For timestamps, we need special handling
  if (orderDirection === 'desc') {
    // Get items before cursor (older items for desc)
    query = query.or(
      `${orderField}.lt.${cursorData.value},` +
      `and(${orderField}.eq.${cursorData.value},id.lt.${cursorData.id})`
    );
  } else {
    // Get items after cursor (newer items for asc)
    query = query.or(
      `${orderField}.gt.${cursorData.value},` +
      `and(${orderField}.eq.${cursorData.value},id.gt.${cursorData.id})`
    );
  }

  return query;
}
