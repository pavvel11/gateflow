/**
 * Payments API v1 - List Payments
 *
 * GET /api/v1/payments - List payment transactions with filters and pagination
 */

import { NextRequest } from 'next/server';
import {
  handleCorsPreFlight,
  jsonResponse,
  apiError,
  authenticate,
  handleApiError,
  successResponse,
  API_SCOPES,
} from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

/**
 * GET /api/v1/payments
 *
 * List payment transactions with optional filters.
 *
 * Query params:
 * - cursor: string (pagination cursor)
 * - limit: number (default 50, max 100)
 * - status: 'all' | 'completed' | 'refunded' | 'failed' | 'pending' (default 'all')
 * - product_id: string (filter by product)
 * - email: string (filter by customer email)
 * - date_from: string ISO date (filter from date)
 * - date_to: string ISO date (filter to date)
 * - sort: string (default '-created_at')
 */
export async function GET(request: NextRequest) {
  try {
    await authenticate(request, [API_SCOPES.ANALYTICS_READ]);

    const adminClient = createAdminClient();
    const { searchParams } = request.nextUrl;

    // Parse params
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const status = searchParams.get('status') || 'all';
    const productId = searchParams.get('product_id');
    const email = searchParams.get('email');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const sort = searchParams.get('sort') || '-created_at';

    // Build query
    let query = adminClient
      .from('payment_transactions')
      .select(`
        id,
        customer_email,
        amount,
        currency,
        status,
        stripe_payment_intent_id,
        product_id,
        products!inner(name, slug),
        user_id,
        session_id,
        refund_id,
        refunded_amount,
        refunded_at,
        refund_reason,
        created_at,
        updated_at
      `);

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by product
    if (productId) {
      query = query.eq('product_id', productId);
    }

    // Filter by email
    if (email) {
      query = query.ilike('customer_email', `%${email}%`);
    }

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (!isNaN(fromDate.getTime())) {
        query = query.gte('created_at', fromDate.toISOString());
      }
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      if (!isNaN(toDate.getTime())) {
        query = query.lte('created_at', toDate.toISOString());
      }
    }

    // Cursor pagination
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
        query = query.lt('created_at', decoded.created_at);
      } catch {
        return apiError(request, 'INVALID_INPUT', 'Invalid cursor format');
      }
    }

    // Sorting
    const isDescending = sort.startsWith('-');
    const sortField = isDescending ? sort.slice(1) : sort;
    const allowedSortFields = ['created_at', 'amount', 'customer_email'];

    if (!allowedSortFields.includes(sortField)) {
      return apiError(request, 'INVALID_INPUT', `Invalid sort field. Allowed: ${allowedSortFields.join(', ')}`);
    }

    query = query.order(sortField, { ascending: !isDescending });

    // Fetch limit + 1 to check has_more
    query = query.limit(limit + 1);

    const { data: payments, error } = await query;

    if (error) {
      console.error('Error fetching payments:', error);
      return apiError(request, 'INTERNAL_ERROR', 'Failed to fetch payments');
    }

    const hasMore = payments.length > limit;
    const items = hasMore ? payments.slice(0, -1) : payments;
    const lastItem = items[items.length - 1];

    // Transform response
    const transformedItems = items.map(p => ({
      id: p.id,
      customer_email: p.customer_email,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      stripe_payment_intent_id: p.stripe_payment_intent_id,
      product: {
        id: p.product_id,
        name: (p.products as { name: string; slug: string })?.name,
        slug: (p.products as { name: string; slug: string })?.slug,
      },
      user_id: p.user_id,
      session_id: p.session_id,
      refund: p.refund_id ? {
        id: p.refund_id,
        amount: p.refunded_amount,
        refunded_at: p.refunded_at,
        reason: p.refund_reason,
      } : null,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    return jsonResponse(
      {
        data: transformedItems,
        pagination: {
          next_cursor: hasMore && lastItem
            ? Buffer.from(JSON.stringify({ created_at: lastItem.created_at })).toString('base64')
            : null,
          has_more: hasMore,
        },
      },
      request
    );
  } catch (error) {
    return handleApiError(error, request);
  }
}
