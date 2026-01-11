/**
 * Order Bumps API v1 - Single Order Bump Operations
 *
 * GET /api/v1/order-bumps/[id] - Get an order bump
 * PATCH /api/v1/order-bumps/[id] - Update an order bump
 * DELETE /api/v1/order-bumps/[id] - Delete an order bump
 */

import { NextRequest } from 'next/server';
import {
  handleCorsPreFlight,
  jsonResponse,
  apiError,
  authenticate,
  handleApiError,
  successResponse,
  noContentResponse,
  API_SCOPES,
} from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

/**
 * GET /api/v1/order-bumps/[id]
 *
 * Get a single order bump.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await authenticate(request, [API_SCOPES.PRODUCTS_READ]);

    const { id } = await context.params;
    const adminClient = createAdminClient();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return apiError(request, 'INVALID_INPUT', 'Invalid order bump ID format');
    }

    const { data, error } = await adminClient
      .from('order_bumps')
      .select(`
        id,
        main_product_id,
        bump_product_id,
        bump_price,
        bump_title,
        bump_description,
        is_active,
        display_order,
        access_duration_days,
        created_at,
        updated_at,
        main_product:products!order_bumps_main_product_id_fkey(id, name, slug),
        bump_product:products!order_bumps_bump_product_id_fkey(id, name, slug, price, currency)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return apiError(request, 'NOT_FOUND', 'Order bump not found');
    }

    return jsonResponse(successResponse(data), request);
  } catch (error) {
    return handleApiError(error, request);
  }
}

/**
 * PATCH /api/v1/order-bumps/[id]
 *
 * Update an existing order bump.
 *
 * Body (all optional):
 * - bump_product_id: string
 * - bump_price: number | null
 * - bump_title: string
 * - bump_description: string
 * - is_active: boolean
 * - display_order: number
 * - access_duration_days: number | null
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await authenticate(request, [API_SCOPES.PRODUCTS_WRITE]);

    const { id } = await context.params;
    const adminClient = createAdminClient();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return apiError(request, 'INVALID_INPUT', 'Invalid order bump ID format');
    }

    // Check if order bump exists
    const { data: existing, error: fetchError } = await adminClient
      .from('order_bumps')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return apiError(request, 'NOT_FOUND', 'Order bump not found');
    }

    const body = await request.json();
    const {
      bump_product_id,
      bump_price,
      bump_title,
      bump_description,
      is_active,
      display_order,
      access_duration_days,
    } = body;

    // Validate bump_price if provided
    if (bump_price !== undefined && bump_price !== null && bump_price < 0) {
      return apiError(request, 'VALIDATION_ERROR', 'Invalid bump price', {
        bump_price: ['Bump price must be non-negative']
      });
    }

    // Validate bump_product_id if changed
    if (bump_product_id) {
      if (!uuidRegex.test(bump_product_id)) {
        return apiError(request, 'INVALID_INPUT', 'Invalid bump product ID format');
      }

      const { data: bumpProduct } = await adminClient
        .from('products')
        .select('id, is_active')
        .eq('id', bump_product_id)
        .single();

      if (!bumpProduct || !bumpProduct.is_active) {
        return apiError(request, 'VALIDATION_ERROR', 'Bump product not found or inactive', {
          bump_product_id: ['Bump product not found or inactive']
        });
      }
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (bump_product_id !== undefined) updates.bump_product_id = bump_product_id;
    if (bump_price !== undefined) updates.bump_price = bump_price;
    if (bump_title !== undefined) updates.bump_title = bump_title;
    if (bump_description !== undefined) updates.bump_description = bump_description;
    if (is_active !== undefined) updates.is_active = is_active;
    if (display_order !== undefined) updates.display_order = display_order;
    if (access_duration_days !== undefined) updates.access_duration_days = access_duration_days;

    // Update order bump
    const { data, error } = await adminClient
      .from('order_bumps')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        main_product_id,
        bump_product_id,
        bump_price,
        bump_title,
        bump_description,
        is_active,
        display_order,
        access_duration_days,
        created_at,
        updated_at,
        main_product:products!order_bumps_main_product_id_fkey(id, name, slug),
        bump_product:products!order_bumps_bump_product_id_fkey(id, name, slug, price, currency)
      `)
      .single();

    if (error) {
      console.error('Error updating order bump:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return apiError(request, 'CONFLICT', 'Order bump already exists for this product pair');
      }

      return apiError(request, 'INTERNAL_ERROR', 'Failed to update order bump');
    }

    return jsonResponse(successResponse(data), request);
  } catch (error) {
    return handleApiError(error, request);
  }
}

/**
 * DELETE /api/v1/order-bumps/[id]
 *
 * Delete an order bump.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await authenticate(request, [API_SCOPES.PRODUCTS_WRITE]);

    const { id } = await context.params;
    const adminClient = createAdminClient();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return apiError(request, 'INVALID_INPUT', 'Invalid order bump ID format');
    }

    // Check if order bump exists
    const { data: existing, error: fetchError } = await adminClient
      .from('order_bumps')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return apiError(request, 'NOT_FOUND', 'Order bump not found');
    }

    // Delete order bump
    const { error } = await adminClient
      .from('order_bumps')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting order bump:', error);
      return apiError(request, 'INTERNAL_ERROR', 'Failed to delete order bump');
    }

    return noContentResponse(request);
  } catch (error) {
    return handleApiError(error, request);
  }
}
