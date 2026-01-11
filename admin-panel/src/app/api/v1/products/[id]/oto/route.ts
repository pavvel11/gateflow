/**
 * Products API v1 - OTO (One-Time Offer) Configuration
 *
 * GET /api/v1/products/[id]/oto - Get OTO configuration
 * PUT /api/v1/products/[id]/oto - Save/Update OTO configuration
 * DELETE /api/v1/products/[id]/oto - Delete OTO configuration
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
 * GET /api/v1/products/[id]/oto
 *
 * Get OTO configuration for a product.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await authenticate(request, [API_SCOPES.PRODUCTS_READ]);

    const { id: productId } = await context.params;
    const adminClient = createAdminClient();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      return apiError(request, 'INVALID_INPUT', 'Invalid product ID format');
    }

    // Check if source product exists
    const { data: product, error: productError } = await adminClient
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return apiError(request, 'NOT_FOUND', 'Product not found');
    }

    // Fetch OTO configuration
    const { data: otoOffer, error } = await adminClient
      .from('oto_offers')
      .select(`
        id,
        source_product_id,
        oto_product_id,
        discount_type,
        discount_value,
        duration_minutes,
        is_active,
        created_at,
        updated_at,
        oto_product:products!oto_offers_oto_product_id_fkey(id, name, slug, price, currency)
      `)
      .eq('source_product_id', productId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch OTO config:', error);
      return jsonResponse(successResponse({ has_oto: false }), request);
    }

    if (!otoOffer) {
      return jsonResponse(successResponse({ has_oto: false }), request);
    }

    return jsonResponse(successResponse({
      has_oto: true,
      oto_product_id: otoOffer.oto_product_id,
      discount_type: otoOffer.discount_type,
      discount_value: otoOffer.discount_value,
      duration_minutes: otoOffer.duration_minutes,
      oto_product: otoOffer.oto_product,
    }), request);
  } catch (error) {
    return handleApiError(error, request);
  }
}

/**
 * PUT /api/v1/products/[id]/oto
 *
 * Save or update OTO configuration for a product.
 *
 * Body:
 * - oto_product_id: string (required) - The product to offer as OTO
 * - discount_type: 'percentage' | 'fixed' (default: 'percentage')
 * - discount_value: number (default: 20)
 * - duration_minutes: number (default: 15)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await authenticate(request, [API_SCOPES.PRODUCTS_WRITE]);

    const { id: productId } = await context.params;
    const adminClient = createAdminClient();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      return apiError(request, 'INVALID_INPUT', 'Invalid product ID format');
    }

    const body = await request.json();
    const {
      oto_product_id,
      discount_type = 'percentage',
      discount_value = 20,
      duration_minutes = 15,
    } = body;

    // Validate required field
    if (!oto_product_id) {
      return apiError(request, 'VALIDATION_ERROR', 'oto_product_id is required', {
        oto_product_id: ['OTO product ID is required']
      });
    }

    // Validate OTO product ID format
    if (!uuidRegex.test(oto_product_id)) {
      return apiError(request, 'INVALID_INPUT', 'Invalid OTO product ID format');
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(discount_type)) {
      return apiError(request, 'VALIDATION_ERROR', 'Invalid discount type', {
        discount_type: ['Must be "percentage" or "fixed"']
      });
    }

    // Validate discount value
    if (typeof discount_value !== 'number' || discount_value < 0) {
      return apiError(request, 'VALIDATION_ERROR', 'Invalid discount value', {
        discount_value: ['Must be a positive number']
      });
    }

    // Validate duration
    if (typeof duration_minutes !== 'number' || duration_minutes < 1) {
      return apiError(request, 'VALIDATION_ERROR', 'Invalid duration', {
        duration_minutes: ['Must be at least 1 minute']
      });
    }

    // Check if source product exists
    const { data: sourceProduct, error: sourceError } = await adminClient
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (sourceError || !sourceProduct) {
      return apiError(request, 'NOT_FOUND', 'Source product not found');
    }

    // Check if OTO product exists
    const { data: otoProduct, error: otoError } = await adminClient
      .from('products')
      .select('id')
      .eq('id', oto_product_id)
      .single();

    if (otoError || !otoProduct) {
      return apiError(request, 'VALIDATION_ERROR', 'OTO product not found', {
        oto_product_id: ['OTO product not found']
      });
    }

    // Upsert OTO configuration
    // First, deactivate any existing OTO for this source product
    await adminClient
      .from('oto_offers')
      .update({ is_active: false })
      .eq('source_product_id', productId);

    // Then insert new OTO offer
    const { data, error } = await adminClient
      .from('oto_offers')
      .insert({
        source_product_id: productId,
        oto_product_id,
        discount_type,
        discount_value,
        duration_minutes,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save OTO config:', error);
      return apiError(request, 'INTERNAL_ERROR', 'Failed to save OTO configuration');
    }

    return jsonResponse(successResponse({
      has_oto: true,
      oto_product_id: data.oto_product_id,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      duration_minutes: data.duration_minutes,
    }), request);
  } catch (error) {
    return handleApiError(error, request);
  }
}

/**
 * DELETE /api/v1/products/[id]/oto
 *
 * Delete OTO configuration for a product.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await authenticate(request, [API_SCOPES.PRODUCTS_WRITE]);

    const { id: productId } = await context.params;
    const adminClient = createAdminClient();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      return apiError(request, 'INVALID_INPUT', 'Invalid product ID format');
    }

    // Deactivate OTO offers for this source product
    const { error } = await adminClient
      .from('oto_offers')
      .update({ is_active: false })
      .eq('source_product_id', productId);

    if (error) {
      console.error('Failed to delete OTO config:', error);
      return apiError(request, 'INTERNAL_ERROR', 'Failed to delete OTO configuration');
    }

    return noContentResponse(request);
  } catch (error) {
    return handleApiError(error, request);
  }
}
