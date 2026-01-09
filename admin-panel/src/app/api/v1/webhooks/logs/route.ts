/**
 * Webhooks API v1 - Webhook Delivery Logs
 *
 * GET /api/v1/webhooks/logs - List webhook delivery logs
 */

import { NextRequest } from 'next/server';
import {
  handleCorsPreFlight,
  jsonResponse,
  apiError,
  authenticate,
  handleApiError,
  API_SCOPES,
} from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

/**
 * GET /api/v1/webhooks/logs
 *
 * List webhook delivery logs with filters.
 *
 * Query params:
 * - cursor: string (pagination cursor)
 * - limit: number (default 50, max 100)
 * - endpoint_id: string (filter by webhook endpoint)
 * - status: 'all' | 'success' | 'failed' | 'archived' | 'retried' (default 'all')
 * - event_type: string (filter by event type)
 */
export async function GET(request: NextRequest) {
  try {
    await authenticate(request, [API_SCOPES.WEBHOOKS_READ]);

    const adminClient = createAdminClient();
    const { searchParams } = request.nextUrl;

    // Parse params
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const endpointId = searchParams.get('endpoint_id');
    const status = searchParams.get('status') || 'all';
    const eventType = searchParams.get('event_type');

    // Build query
    let query = adminClient
      .from('webhook_logs')
      .select(`
        id,
        endpoint_id,
        event_type,
        payload,
        http_status,
        response_body,
        error_message,
        duration_ms,
        status,
        created_at,
        endpoint:webhook_endpoints (
          id,
          url,
          description,
          is_active
        )
      `);

    // Filter by endpoint
    if (endpointId) {
      query = query.eq('endpoint_id', endpointId);
    }

    // Filter by status
    if (status !== 'all') {
      const validStatuses = ['success', 'failed', 'archived', 'retried'];
      if (validStatuses.includes(status)) {
        query = query.eq('status', status);
      } else {
        return apiError(request, 'INVALID_INPUT', `Invalid status. Valid values: ${validStatuses.join(', ')}`);
      }
    }

    // Filter by event type
    if (eventType) {
      query = query.eq('event_type', eventType);
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

    // Sort and limit
    query = query
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching webhook logs:', error);
      return apiError(request, 'INTERNAL_ERROR', 'Failed to fetch webhook logs');
    }

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, -1) : logs;
    const lastItem = items[items.length - 1];

    // Transform response
    const transformedItems = items.map(log => ({
      id: log.id,
      endpoint_id: log.endpoint_id,
      endpoint: log.endpoint ? {
        id: (log.endpoint as any).id,
        url: (log.endpoint as any).url,
        description: (log.endpoint as any).description,
        is_active: (log.endpoint as any).is_active,
      } : null,
      event_type: log.event_type,
      payload: log.payload,
      http_status: log.http_status,
      response_body: log.response_body,
      error_message: log.error_message,
      duration_ms: log.duration_ms,
      status: log.status,
      created_at: log.created_at,
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
