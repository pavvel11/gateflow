import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/refund-requests - Get user's refund requests
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('refund_requests')
      .select(`
        *,
        products:product_id (name, icon, slug),
        payment_transactions:transaction_id (created_at, amount, currency)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ requests: data });
  } catch (error) {
    console.error('Error fetching refund requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch refund requests' },
      { status: 500 }
    );
  }
}

// POST /api/refund-requests - Create a refund request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { transaction_id, reason } = body;

    if (!transaction_id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Use the database function to create the request
    const { data, error } = await supabase
      .rpc('create_refund_request', {
        transaction_id_param: transaction_id,
        reason_param: reason || null,
      });

    if (error) throw error;

    if (!data.success) {
      return NextResponse.json(
        { error: data.error, details: data.details },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating refund request:', error);
    return NextResponse.json(
      { error: 'Failed to create refund request' },
      { status: 500 }
    );
  }
}
