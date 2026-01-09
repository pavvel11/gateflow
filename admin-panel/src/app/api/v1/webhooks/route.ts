/**
 * Webhooks API v1 - List and Create Webhooks
 *
 * GET /api/v1/webhooks - List webhook endpoints
 * POST /api/v1/webhooks - Create a new webhook endpoint
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
import { isValidWebhookUrl, validateEventTypes } from '@/lib/validations/webhook';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

/**
 * GET /api/v1/webhooks
 *
 * List all webhook endpoints.
 *
 * Query params:
 * - cursor: string (pagination cursor)
 * - limit: number (default 50, max 100)
 * - status: 'all' | 'active' | 'inactive' (default 'all')
 */
export async function GET(request: NextRequest) {
  try {
    await authenticate(request, [API_SCOPES.WEBHOOKS_READ]);

    const adminClient = createAdminClient();
    const { searchParams } = request.nextUrl;

    // Parse params
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const status = searchParams.get('status') || 'all';

    // Build query
    let query = adminClient
      .from('webhook_endpoints')
      .select(`
        id,
        url,
        events,
        description,
        is_active,
        created_at,
        updated_at
      `);

    // Filter by status
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
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

    const { data: webhooks, error } = await query;

    if (error) {
      console.error('Error fetching webhooks:', error);
      return apiError(request, 'INTERNAL_ERROR', 'Failed to fetch webhooks');
    }

    const hasMore = webhooks.length > limit;
    const items = hasMore ? webhooks.slice(0, -1) : webhooks;
    const lastItem = items[items.length - 1];

    return jsonResponse(
      {
        data: items,
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

/**
 * POST /api/v1/webhooks
 *
 * Create a new webhook endpoint.
 *
 * Request body:
 * - url: string (required) - Webhook URL (must be HTTPS)
 * - events: string[] (required) - List of event types to subscribe to
 * - description: string (optional) - Description of the webhook
 * - is_active: boolean (optional, default true) - Whether the webhook is active
 */
export async function POST(request: NextRequest) {
  try {
    await authenticate(request, [API_SCOPES.WEBHOOKS_WRITE]);

    const adminClient = createAdminClient();

    // Parse body
    let body: {
      url?: string;
      events?: string[];
      description?: string;
      is_active?: boolean;
    };

    try {
      body = await request.json();
    } catch {
      return apiError(request, 'INVALID_INPUT', 'Invalid JSON body');
    }

    const { url, events, description, is_active = true } = body;

    // Validate required fields
    if (!url) {
      return apiError(request, 'INVALID_INPUT', 'URL is required');
    }

    if (!events) {
      return apiError(request, 'INVALID_INPUT', 'Events array is required');
    }

    // Validate URL (SSRF protection)
    const urlValidation = isValidWebhookUrl(url);
    if (!urlValidation.valid) {
      return apiError(request, 'INVALID_INPUT', urlValidation.error || 'Invalid webhook URL');
    }

    // Validate events
    const eventsValidation = validateEventTypes(events);
    if (!eventsValidation.valid) {
      return apiError(request, 'INVALID_INPUT', eventsValidation.error || 'Invalid event types');
    }

    // Create webhook
    const { data: webhook, error } = await adminClient
      .from('webhook_endpoints')
      .insert({
        url,
        events,
        description: description || null,
        is_active,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating webhook:', error);
      if (error.code === '23505') {
        return apiError(request, 'ALREADY_EXISTS', 'A webhook with this URL already exists');
      }
      return apiError(request, 'INTERNAL_ERROR', 'Failed to create webhook');
    }

    return jsonResponse(
      successResponse({
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        description: webhook.description,
        is_active: webhook.is_active,
        created_at: webhook.created_at,
        updated_at: webhook.updated_at,
      }),
      request,
      201
    );
  } catch (error) {
    return handleApiError(error, request);
  }
}
