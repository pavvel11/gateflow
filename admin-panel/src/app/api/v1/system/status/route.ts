/**
 * System API v1 - Status
 *
 * GET /api/v1/system/status - Get detailed system status (authenticated)
 */

import { NextRequest } from 'next/server';
import {
  handleCorsPreFlight,
  jsonResponse,
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
 * GET /api/v1/system/status
 *
 * Get detailed system status including database health, counts, and version info.
 * Requires SYSTEM_READ scope.
 */
export async function GET(request: NextRequest) {
  try {
    await authenticate(request, [API_SCOPES.SYSTEM_READ]);

    const adminClient = createAdminClient();
    const now = new Date();

    // Check database connectivity by running simple counts
    let databaseHealthy = true;
    let databaseError: string | null = null;

    // Get product counts
    const { count: totalProducts, error: productsError } = await adminClient
      .from('products')
      .select('*', { count: 'exact', head: true });

    const { count: activeProducts } = await adminClient
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (productsError) {
      databaseHealthy = false;
      databaseError = productsError.message;
    }

    // Get user counts
    const { count: totalUsers } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get transaction counts
    const { count: totalTransactions } = await adminClient
      .from('payment_transactions')
      .select('*', { count: 'exact', head: true });

    const { count: completedTransactions } = await adminClient
      .from('payment_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // Get pending refund requests
    const { count: pendingRefunds } = await adminClient
      .from('refund_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get active webhooks
    const { count: activeWebhooks } = await adminClient
      .from('webhook_endpoints')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get active coupons
    const { count: activeCoupons } = await adminClient
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get API key count
    const { count: activeApiKeys } = await adminClient
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const response = {
      status: databaseHealthy ? 'healthy' : 'degraded',
      timestamp: now.toISOString(),
      version: {
        api: 'v1',
        service: 'gateflow-admin',
        build: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'development',
      },
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: databaseHealthy,
        error: databaseError,
      },
      counts: {
        products: {
          total: totalProducts || 0,
          active: activeProducts || 0,
        },
        users: {
          total: totalUsers || 0,
        },
        transactions: {
          total: totalTransactions || 0,
          completed: completedTransactions || 0,
        },
        refund_requests: {
          pending: pendingRefunds || 0,
        },
        webhooks: {
          active: activeWebhooks || 0,
        },
        coupons: {
          active: activeCoupons || 0,
        },
        api_keys: {
          active: activeApiKeys || 0,
        },
      },
      features: {
        stripe_enabled: !!process.env.STRIPE_SECRET_KEY,
        webhooks_enabled: true,
        api_keys_enabled: true,
      },
    };

    return jsonResponse(successResponse(response), request);
  } catch (error) {
    return handleApiError(error, request);
  }
}
