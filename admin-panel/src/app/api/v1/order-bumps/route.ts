/**
 * Order Bumps API v1
 *
 * GET /api/v1/order-bumps - List all order bumps
 * POST /api/v1/order-bumps - Create a new order bump
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
 * GET /api/v1/order-bumps
 *
 * List all order bumps or bumps for specific product.
 *
 * Query params:
 * - product_id: UUID (optional) - Filter by main product
 */
export async function GET(request: NextRequest) {
  try {
    await authenticate(request, [API_SCOPES.PRODUCTS_READ]);

    const adminClient = createAdminClient();
    const { searchParams } = request.nextUrl;
    const productId = searchParams.get('product_id');

    if (productId) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(productId)) {
        return apiError(request, 'INVALID_INPUT', 'Invalid product ID format');
      }

      // Get bumps for specific product using direct query
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
        .eq('main_product_id', productId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching product order bumps:', error);
        return apiError(request, 'INTERNAL_ERROR', 'Failed to fetch order bumps');
      }

      return jsonResponse({ data: data || [] }, request);
    } else {
      // Get all bumps
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
        .order('created_at', { ascending: false })
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching all order bumps:', error);
        return apiError(request, 'INTERNAL_ERROR', 'Failed to fetch order bumps');
      }

      return jsonResponse({ data: data || [] }, request);
    }
  } catch (error) {
    return handleApiError(error, request);
  }
}

/**
 * POST /api/v1/order-bumps
 *
 * Create a new order bump configuration.
 *
 * Body:
 * - main_product_id: string (required)
 * - bump_product_id: string (required)
 * - bump_title: string (required)
 * - bump_price: number | null (optional)
 * - bump_description: string (optional)
 * - is_active: boolean (default: true)
 * - display_order: number (default: 0)
 * - access_duration_days: number | null (optional)
 */
export async function POST(request: NextRequest) {
  try {
    await authenticate(request, [API_SCOPES.PRODUCTS_WRITE]);

    const adminClient = createAdminClient();
    const body = await request.json();
    const {
      main_product_id,
      bump_product_id,
      bump_title,
      bump_price,
      bump_description,
      is_active = true,
      display_order = 0,
      access_duration_days,
    } = body;

    // Validate required fields
    const errors: Record<string, string[]> = {};
    if (!main_product_id) {
      errors.main_product_id = ['Main product ID is required'];
    }
    if (!bump_product_id) {
      errors.bump_product_id = ['Bump product ID is required'];
    }
    if (!bump_title) {
      errors.bump_title = ['Bump title is required'];
    }

    if (Object.keys(errors).length > 0) {
      return apiError(request, 'VALIDATION_ERROR', 'Missing required fields', errors);
    }

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(main_product_id)) {
      return apiError(request, 'INVALID_INPUT', 'Invalid main product ID format');
    }
    if (!uuidRegex.test(bump_product_id)) {
      return apiError(request, 'INVALID_INPUT', 'Invalid bump product ID format');
    }

    // Validate that products exist and are active
    const { data: mainProduct } = await adminClient
      .from('products')
      .select('id, is_active')
      .eq('id', main_product_id)
      .single();

    if (!mainProduct || !mainProduct.is_active) {
      return apiError(request, 'VALIDATION_ERROR', 'Main product not found or inactive', {
        main_product_id: ['Main product not found or inactive']
      });
    }

    const { data: bumpProduct } = await adminClient
      .from('products')
      .select('id, is_active, price')
      .eq('id', bump_product_id)
      .single();

    if (!bumpProduct || !bumpProduct.is_active) {
      return apiError(request, 'VALIDATION_ERROR', 'Bump product not found or inactive', {
        bump_product_id: ['Bump product not found or inactive']
      });
    }

    // Validate bump_price if provided
    if (bump_price !== null && bump_price !== undefined && bump_price < 0) {
      return apiError(request, 'VALIDATION_ERROR', 'Invalid bump price', {
        bump_price: ['Bump price must be non-negative']
      });
    }

    // Create order bump
    const { data, error } = await adminClient
      .from('order_bumps')
      .insert({
        main_product_id,
        bump_product_id,
        bump_price: bump_price ?? null,
        bump_title,
        bump_description: bump_description || null,
        is_active,
        display_order,
        access_duration_days: access_duration_days ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating order bump:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return apiError(request, 'CONFLICT', 'Order bump already exists for this product pair');
      }

      return apiError(request, 'INTERNAL_ERROR', 'Failed to create order bump');
    }

    return jsonResponse({ data }, request, 201);
  } catch (error) {
    return handleApiError(error, request);
  }
}
