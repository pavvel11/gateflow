/**
 * Variant Groups API v1
 *
 * GET /api/v1/variant-groups - List all variant groups
 * POST /api/v1/variant-groups - Create a new variant group
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

interface ProductInGroup {
  id: string;
  product_id: string;
  group_id: string;
  variant_name: string | null;
  display_order: number;
  is_featured: boolean;
  created_at: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    currency: string;
    icon: string | null;
    is_active: boolean;
  };
}

interface VariantGroupWithProducts {
  id: string;
  name: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string;
  products: ProductInGroup[];
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

/**
 * GET /api/v1/variant-groups
 *
 * List all variant groups with their products.
 */
export async function GET(request: NextRequest) {
  try {
    await authenticate(request, [API_SCOPES.PRODUCTS_READ]);

    const adminClient = createAdminClient();

    // Get all variant groups
    const { data: groups, error: groupsError } = await adminClient
      .from('variant_groups')
      .select('id, name, slug, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (groupsError) {
      console.error('Error fetching variant groups:', groupsError);
      return apiError(request, 'INTERNAL_ERROR', 'Failed to fetch variant groups');
    }

    // Get all product-group relationships with product details
    const { data: productGroups, error: pgError } = await adminClient
      .from('product_variant_groups')
      .select(`
        id,
        product_id,
        group_id,
        variant_name,
        display_order,
        is_featured,
        created_at,
        products:product_id (
          id,
          name,
          slug,
          price,
          currency,
          icon,
          is_active
        )
      `)
      .order('display_order', { ascending: true });

    if (pgError) {
      console.error('Error fetching product variant groups:', pgError);
      return apiError(request, 'INTERNAL_ERROR', 'Failed to fetch product variant groups');
    }

    // Build response with products nested under groups
    const groupsWithProducts: VariantGroupWithProducts[] = (groups || []).map(group => ({
      ...group,
      products: (productGroups || [])
        .filter(pg => pg.group_id === group.id)
        .map(pg => ({
          id: pg.id,
          product_id: pg.product_id,
          group_id: pg.group_id,
          variant_name: pg.variant_name,
          display_order: pg.display_order,
          is_featured: pg.is_featured,
          created_at: pg.created_at,
          product: pg.products as unknown as ProductInGroup['product']
        }))
        .sort((a, b) => a.display_order - b.display_order)
    }));

    return jsonResponse({ data: groupsWithProducts }, request);
  } catch (error) {
    return handleApiError(error, request);
  }
}

/**
 * POST /api/v1/variant-groups
 *
 * Create a new variant group.
 *
 * Body:
 * - name: string (optional) - Group name
 * - slug: string (optional) - URL slug
 * - products: Array<{ product_id: string, variant_name?: string, is_featured?: boolean }> (required)
 */
export async function POST(request: NextRequest) {
  try {
    await authenticate(request, [API_SCOPES.PRODUCTS_WRITE]);

    const adminClient = createAdminClient();
    const body = await request.json();
    const { name, slug, products } = body as {
      name?: string;
      slug?: string;
      products: Array<{
        product_id: string;
        variant_name?: string;
        is_featured?: boolean;
      }>;
    };

    // Validate required field
    if (!products || products.length < 2) {
      return apiError(request, 'VALIDATION_ERROR', 'At least 2 products are required', {
        products: ['At least 2 products are required to create a variant group']
      });
    }

    // Validate slug format if provided
    if (slug && !/^[a-z0-9_-]+$/.test(slug)) {
      return apiError(request, 'VALIDATION_ERROR', 'Invalid slug format', {
        slug: ['Slug must contain only lowercase letters, numbers, hyphens, and underscores']
      });
    }

    // Validate product UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const p of products) {
      if (!uuidRegex.test(p.product_id)) {
        return apiError(request, 'VALIDATION_ERROR', 'Invalid product ID format', {
          products: [`Invalid UUID format for product_id: ${p.product_id}`]
        });
      }
    }

    // Create the variant group
    const { data: newGroup, error: groupError } = await adminClient
      .from('variant_groups')
      .insert({ name: name || null, slug: slug || null })
      .select('id, name, slug, created_at, updated_at')
      .single();

    if (groupError || !newGroup) {
      console.error('Error creating variant group:', groupError);
      // Check for unique constraint violation (duplicate slug)
      if (groupError?.code === '23505') {
        return apiError(request, 'CONFLICT', 'Slug already exists');
      }
      return apiError(request, 'INTERNAL_ERROR', 'Failed to create variant group');
    }

    // Add products to the group
    const productGroupEntries = products.map((p, index) => ({
      product_id: p.product_id,
      group_id: newGroup.id,
      variant_name: p.variant_name || null,
      display_order: index,
      is_featured: p.is_featured || false
    }));

    const { error: pgError } = await adminClient
      .from('product_variant_groups')
      .insert(productGroupEntries);

    if (pgError) {
      // Rollback: delete the group
      await adminClient.from('variant_groups').delete().eq('id', newGroup.id);
      console.error('Error adding products to group:', pgError);
      return apiError(request, 'INTERNAL_ERROR', 'Failed to add products to variant group');
    }

    return jsonResponse(
      {
        data: {
          id: newGroup.id,
          name: newGroup.name,
          slug: newGroup.slug,
          created_at: newGroup.created_at,
          updated_at: newGroup.updated_at,
          products_count: products.length
        }
      },
      request,
      201
    );
  } catch (error) {
    return handleApiError(error, request);
  }
}
