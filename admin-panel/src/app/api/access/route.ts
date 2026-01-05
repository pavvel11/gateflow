import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  validateAccessCheck,
  sanitizeAccessCheckData
} from '@/lib/validations/access';
import {
  validateCrossOriginRequest,
  getCrossOriginHeaders,
  createCrossOriginOptionsResponse
} from '@/lib/cors';

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: Request) {
  return createCrossOriginOptionsResponse(request);
}

/**
 * Check product access for authenticated user
 *
 * SECURITY: This endpoint is allowed cross-origin because it only returns
 * read-only data (true/false for access). It does NOT modify any data
 * or return sensitive information.
 */
export async function POST(request: Request) {
  const corsHeaders = getCrossOriginHeaders(request);

  try {
    // 🔐 SECURITY: Validate X-Requested-With header (CSRF protection)
    const validationError = validateCrossOriginRequest(request);
    if (validationError) {
      logger.security('Blocked cross-origin request without X-Requested-With', {
        origin: request.headers.get('origin'),
        userAgent: request.headers.get('user-agent')?.slice(0, 100),
      });
      return validationError;
    }

    // Log GateFlow request details
    const gateflowOrigin = request.headers.get('X-GateFlow-Origin');
    const gateflowVersion = request.headers.get('X-GateFlow-Version');
    logger.security('GateFlow access request:', {
      origin: gateflowOrigin,
      version: gateflowVersion,
      userAgent: request.headers.get('user-agent')?.slice(0, 100),
      timestamp: new Date().toISOString()
    });

    // Create Supabase client with server-side auth
    const supabase = await createClient()

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      logger.error('Session check error:', sessionError.message);
      return NextResponse.json(
        { hasAccess: false, error: sessionError.message },
        { status: 200, headers: corsHeaders }
      )
    }

    // Parse request body
    const body = await request.json()

    // Sanitize input data
    const sanitizedData = sanitizeAccessCheckData(body);

    // Validate input data
    const validation = validateAccessCheck(sanitizedData);
    if (!validation.isValid) {
      return NextResponse.json(
        { hasAccess: false, error: 'Validation failed', details: validation.errors },
        { status: 400, headers: corsHeaders }
      );
    }

    const { productSlug, productSlugs } = sanitizedData;

    // Support both single productSlug and array productSlugs
    const slugsToCheck = productSlugs ? (productSlugs as string[]) : (productSlug ? [productSlug as string] : []);

    if (!slugsToCheck.length) {
      return NextResponse.json(
        { hasAccess: false, error: 'Product slug(s) required' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!session?.user) {
      // No user session - check if these are free access products
      const freeAccessResults: { [key: string]: boolean } = {};

      for (const slug of slugsToCheck) {
        const { data: freeAccess } = await supabase.rpc('grant_free_product_access', {
          product_slug_param: slug
        });
        freeAccessResults[slug] = !!freeAccess;
      }

      // Return format depends on whether it was single or batch request
      if (productSlugs) {
        return NextResponse.json(
          { accessResults: freeAccessResults, isFreeAccess: true },
          { status: 200, headers: corsHeaders }
        )
      } else {
        return NextResponse.json(
          { hasAccess: freeAccessResults[slugsToCheck[0]], isFreeAccess: true },
          { status: 200, headers: corsHeaders }
        )
      }
    }

    // Check access using RPC function
    if (productSlugs) {
      // Batch access check
      const { data: accessResults, error: accessError } = await supabase.rpc('batch_check_user_product_access', {
        product_slugs_param: slugsToCheck
      });

      if (accessError) {
        console.error('Batch access check error:', accessError)
        return NextResponse.json(
          { accessResults: {}, error: accessError.message },
          { status: 200, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { accessResults: accessResults || {}, userId: session.user.id },
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      )
    } else {
      // Single access check
      const { data: hasAccess, error: accessError } = await supabase.rpc('check_user_product_access', {
        product_slug_param: slugsToCheck[0]
      });

      if (accessError) {
        console.error('Access check error:', accessError)
        return NextResponse.json(
          { hasAccess: false, error: accessError.message },
          { status: 200, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { hasAccess: !!hasAccess, userId: session.user.id },
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      )
    }
  } catch (error) {
    console.error('Access API error:', error)

    return NextResponse.json(
      { hasAccess: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
