import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*';
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}

/**
 * Public status endpoint - no authentication required
 * Returns basic system status and counts
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get basic product count (public products only)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, is_active')
      .eq('is_active', true);

    if (productsError) {
      console.error('Error fetching products for status:', productsError);
    }

    // Get basic system info
    const status = {
      system: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'gateflow-admin',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      api: {
        health: '/api/health',
        gatekeeper: '/api/gatekeeper',
        config: '/api/config',
        status: '/api/status'
      },
      frontend: {
        login: '/login',
        dashboard: '/dashboard',
        products: '/dashboard/products'
      },
      counts: {
        total_products: products?.length || 0,
        active_products: products?.length || 0,
        all_products: products?.length || 0
      },
      database: {
        connected: !productsError,
        error: productsError ? 'Connection failed' : null
      }
    };

    return NextResponse.json(status, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('Error in status endpoint:', error);
    return NextResponse.json(
      { 
        system: {
          status: 'error',
          timestamp: new Date().toISOString(),
          service: 'gateflow-admin',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        },
        error: 'Internal server error',
        database: {
          connected: false,
          error: 'Connection failed'
        },
        counts: {
          total_products: 0,
          active_products: 0,
          all_products: 0
        }
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}
