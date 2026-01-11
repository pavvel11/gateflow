/**
 * Users API v1 - List Users
 *
 * GET /api/v1/users - List users with cursor-based pagination
 */

import { NextRequest } from 'next/server';
import {
  handleCorsPreFlight,
  jsonResponse,
  apiError,
  authenticate,
  handleApiError,
  successResponse,
  parseLimit,
  createPaginationResponse,
  decodeCursor,
  encodeCursor,
  API_SCOPES,
} from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { escapeIlikePattern } from '@/lib/validations/product';

// Valid sort columns for users
const USER_SORT_COLUMNS: Record<string, string> = {
  'created_at': 'user_created_at',
  'user_created_at': 'user_created_at',
  'email': 'email',
  'last_sign_in_at': 'last_sign_in_at',
  'total_products': 'total_products',
  'total_value': 'total_value',
  'last_access_granted_at': 'last_access_granted_at',
};

function validateUserSortColumn(sortBy: string | null): string {
  if (!sortBy || typeof sortBy !== 'string') {
    return 'user_created_at';
  }
  return USER_SORT_COLUMNS[sortBy] || 'user_created_at';
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

/**
 * GET /api/v1/users
 *
 * Query parameters:
 * - cursor: Pagination cursor (optional)
 * - limit: Items per page, max 100 (default: 20)
 * - search: Search by email (optional)
 * - sort_by: Sort field (default: 'created_at')
 * - sort_order: Sort direction - 'asc' or 'desc' (default: 'desc')
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate with users:read scope
    await authenticate(request, [API_SCOPES.USERS_READ]);

    // Use admin client to access user views
    const adminClient = createAdminClient();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = parseLimit(searchParams.get('limit'));
    const search = searchParams.get('search') || '';
    const sortByRaw = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc';

    // Validate sort column
    const sortBy = validateUserSortColumn(sortByRaw);

    // Build query for user stats
    let query = adminClient
      .from('user_access_stats')
      .select('*');

    // Apply search filter
    if (search) {
      const escapedSearch = escapeIlikePattern(search);
      query = query.ilike('email', `%${escapedSearch}%`);
    }

    // Apply cursor pagination
    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (cursorData && cursorData.field === sortBy && cursorData.direction === sortOrder) {
        if (sortOrder === 'desc') {
          query = query.or(
            `${sortBy}.lt.${cursorData.value},` +
            `and(${sortBy}.eq.${cursorData.value},user_id.lt.${cursorData.id})`
          );
        } else {
          query = query.or(
            `${sortBy}.gt.${cursorData.value},` +
            `and(${sortBy}.eq.${cursorData.value},user_id.gt.${cursorData.id})`
          );
        }
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.order('user_id', { ascending: sortOrder === 'asc' });

    // Fetch limit + 1 to check for more
    query = query.limit(limit + 1);

    const { data: userStats, error: statsError } = await query;

    if (statsError) {
      console.error('Error fetching user stats:', statsError);
      return apiError(request, 'INTERNAL_ERROR', 'Failed to fetch users');
    }

    const allUsers = userStats || [];
    const hasMore = allUsers.length > limit;
    const users = hasMore ? allUsers.slice(0, limit) : allUsers;

    // Get product access for the users in this page
    const userIds = users.map(u => u.user_id);
    let userAccess: any[] = [];

    if (userIds.length > 0) {
      const { data: accessData, error: accessError } = await adminClient
        .from('user_product_access_detailed')
        .select('*')
        .in('user_id', userIds)
        .order('access_created_at', { ascending: false });

      if (accessError) {
        console.error('Error fetching user access:', accessError);
        // Continue without access data
      } else {
        userAccess = accessData || [];
      }
    }

    // Transform data
    const transformedUsers = users.map(userStat => {
      const productAccess = userAccess
        .filter(access => access.user_id === userStat.user_id)
        .map(access => ({
          id: access.id,
          product_id: access.product_id,
          product_slug: access.product_slug,
          product_name: access.product_name,
          product_price: access.product_price,
          product_currency: access.product_currency,
          product_icon: access.product_icon,
          product_is_active: access.product_is_active,
          granted_at: access.access_created_at,
          expires_at: access.access_expires_at,
        }));

      return {
        id: userStat.user_id,
        email: userStat.email,
        created_at: userStat.user_created_at,
        email_confirmed_at: userStat.email_confirmed_at,
        last_sign_in_at: userStat.last_sign_in_at,
        raw_user_meta_data: userStat.raw_user_meta_data,
        product_access: productAccess,
        stats: {
          total_products: userStat.total_products,
          total_value: userStat.total_value,
          last_access_granted_at: userStat.last_access_granted_at,
          first_access_granted_at: userStat.first_access_granted_at,
        },
      };
    });

    // Build pagination
    let nextCursor: string | null = null;
    if (hasMore && users.length > 0) {
      const lastUser = users[users.length - 1];
      const fieldValue = (lastUser as Record<string, unknown>)[sortBy];
      if (lastUser.user_id) {
        nextCursor = encodeCursor({
          field: sortBy,
          value: String(fieldValue ?? ''),
          id: lastUser.user_id,
          direction: sortOrder,
        });
      }
    }

    return jsonResponse(
      successResponse(transformedUsers, {
        cursor,
        next_cursor: nextCursor,
        has_more: hasMore,
        limit,
      }),
      request
    );
  } catch (error) {
    return handleApiError(error, request);
  }
}
