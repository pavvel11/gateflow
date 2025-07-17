// app/api/admin/payments/stats/route.ts
// API endpoint for payment statistics

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check admin privileges
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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

    // Get pending sessions count
    const { count: pendingSessions } = await supabase
      .from('payment_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

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
