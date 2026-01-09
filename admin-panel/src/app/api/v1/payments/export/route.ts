/**
 * Payments API v1 - Export
 *
 * POST /api/v1/payments/export - Export payment transactions as CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  handleCorsPreFlight,
  apiError,
  authenticate,
  handleApiError,
  API_SCOPES,
  getApiCorsHeaders,
} from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiting';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

/**
 * POST /api/v1/payments/export
 *
 * Export payment transactions as CSV.
 *
 * Body:
 * - status: 'all' | 'completed' | 'refunded' | 'failed' | 'pending' (default: 'all')
 * - date_from: ISO date string (optional)
 * - date_to: ISO date string (optional)
 * - product_id: UUID (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request, [API_SCOPES.ANALYTICS_READ]);

    // Rate limit export operations (heavy DB queries)
    const userId = authResult.method === 'session' ? authResult.admin.userId : authResult.apiKey?.id;

    if (userId) {
      const rateLimitOk = await checkRateLimit(
        RATE_LIMITS.ADMIN_EXPORT.actionType,
        RATE_LIMITS.ADMIN_EXPORT.maxRequests,
        RATE_LIMITS.ADMIN_EXPORT.windowMinutes,
        userId
      );

      if (!rateLimitOk) {
        return apiError(request, 'RATE_LIMITED', 'Rate limit exceeded. Maximum 5 exports per hour.');
      }
    }

    const adminClient = createAdminClient();
    const filters = await request.json();

    // Build query for transactions
    let query = adminClient
      .from('payment_transactions')
      .select(`
        id,
        session_id,
        user_id,
        customer_email,
        amount,
        currency,
        status,
        refunded_amount,
        refund_reason,
        created_at,
        updated_at,
        products!inner(name, slug)
      `)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Apply date range filter
    if (filters.date_from) {
      const fromDate = new Date(filters.date_from);
      if (!isNaN(fromDate.getTime())) {
        query = query.gte('created_at', fromDate.toISOString());
      }
    }

    if (filters.date_to) {
      const toDate = new Date(filters.date_to);
      if (!isNaN(toDate.getTime())) {
        query = query.lte('created_at', toDate.toISOString());
      }
    }

    // Apply product filter
    if (filters.product_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(filters.product_id)) {
        return apiError(request, 'INVALID_INPUT', 'Invalid product ID format');
      }
      query = query.eq('product_id', filters.product_id);
    }

    // Legacy support: dateRange as number of days
    if (filters.dateRange && filters.dateRange !== 'all' && !filters.date_from) {
      const days = parseInt(filters.dateRange);
      if (!isNaN(days)) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('created_at', startDate.toISOString());
      }
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Error fetching transactions for export:', error);
      return apiError(request, 'INTERNAL_ERROR', 'Failed to fetch transactions');
    }

    // Convert to CSV
    const csvHeaders = [
      'Transaction ID',
      'Session ID',
      'User ID',
      'Customer Email',
      'Product Name',
      'Product Slug',
      'Amount',
      'Currency',
      'Status',
      'Refunded Amount',
      'Refund Reason',
      'Created At',
      'Updated At'
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const csvRows = transactions?.map((transaction: any) => [
      transaction.id,
      transaction.session_id || '',
      transaction.user_id || '',
      transaction.customer_email || '',
      Array.isArray(transaction.products) ? transaction.products[0]?.name || '' : transaction.products?.name || '',
      Array.isArray(transaction.products) ? transaction.products[0]?.slug || '' : transaction.products?.slug || '',
      transaction.amount,
      transaction.currency,
      transaction.status,
      transaction.refunded_amount || 0,
      transaction.refund_reason || '',
      new Date(transaction.created_at).toISOString(),
      new Date(transaction.updated_at).toISOString()
    ]) || [];

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row =>
        row.map(field =>
          typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))
            ? `"${field.replace(/"/g, '""')}"`
            : field
        ).join(',')
      )
    ].join('\n');

    // Return CSV file with CORS headers
    const origin = request.headers.get('origin');
    const corsHeaders = getApiCorsHeaders(origin);
    return new NextResponse(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="payments-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
