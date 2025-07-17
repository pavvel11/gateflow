// app/api/admin/payments/export/route.ts
// API endpoint for exporting payment data as CSV

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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

    // Get filters from request body
    const filters = await request.json();

    // Build query for transactions
    let query = supabase
      .from('payment_transactions')
      .select(`
        id,
        session_id,
        user_id,
        amount,
        currency,
        status,
        refunded_amount,
        refund_reason,
        created_at,
        updated_at,
        products!inner(name, slug)
      `)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Apply date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const days = parseInt(filters.dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Error fetching transactions for export:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Convert to CSV
    const csvHeaders = [
      'Transaction ID',
      'Session ID',
      'User ID',
      'Product Name',
      'Product Slug',
      'Amount',
      'Currency',
      'Status',
      'Refunded Amount',
      'Refund Reason',
      'Created At',
      'Updated At'
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const csvRows = transactions?.map((transaction: any) => [
      transaction.id,
      transaction.session_id,
      transaction.user_id,
      Array.isArray(transaction.products) ? transaction.products[0]?.name || '' : transaction.products?.name || '',
      Array.isArray(transaction.products) ? transaction.products[0]?.slug || '' : transaction.products?.slug || '',
      transaction.amount,
      transaction.currency,
      transaction.status,
      transaction.refunded_amount || 0,
      transaction.refund_reason || '',
      new Date(transaction.created_at).toISOString(),
      new Date(transaction.updated_at).toISOString()
    ]) || [];

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          typeof field === 'string' && field.includes(',') 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(',')
      )
    ].join('\n');

    // Return CSV file
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payments-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
