// app/api/admin/payments/stats/route.ts
// API endpoint for payment statistics

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiting';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    let user: { id: string } | null = null;

    // Try Bearer token auth first (for API clients)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: { user: tokenUser }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && tokenUser) {
        user = tokenUser;
      }
    }

    // Fall back to cookie auth (for browser clients)
    if (!user) {
      const supabase = await createServerClient();
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && cookieUser) {
        user = cookieUser;
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin privileges
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // SECURITY: Rate limit analytics operations (aggregation queries can be expensive)
    const rateLimitOk = await checkRateLimit(
      RATE_LIMITS.ADMIN_ANALYTICS.actionType,
      RATE_LIMITS.ADMIN_ANALYTICS.maxRequests,
      RATE_LIMITS.ADMIN_ANALYTICS.windowMinutes,
      user.id
    );

    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 30 requests per 5 minutes.' },
        { status: 429 }
      );
    }

    // Calculate date ranges
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get total transactions count
    const { count: totalTransactions } = await supabase
      .from('payment_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // Get total revenue
    const { data: revenueData } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'completed');

    const totalRevenue = revenueData?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;

    // Get pending sessions count - not applicable in embedded checkout
    const pendingSessions = 0; // Embedded checkout doesn't use payment_sessions

    // Get refunded amount
    const { data: refundData } = await supabase
      .from('payment_transactions')
      .select('refunded_amount')
      .gt('refunded_amount', 0);

    const refundedAmount = refundData?.reduce((sum, transaction) => sum + transaction.refunded_amount, 0) || 0;

    // Get today's revenue
    const { data: todayRevenueData } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', todayStart.toISOString());

    const todayRevenue = todayRevenueData?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;

    // Get this month's revenue
    const { data: monthRevenueData } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', monthStart.toISOString());

    const thisMonthRevenue = monthRevenueData?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;

    const stats = {
      totalTransactions: totalTransactions || 0,
      totalRevenue,
      pendingSessions: pendingSessions || 0,
      refundedAmount,
      todayRevenue,
      thisMonthRevenue,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
