import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, productId } = await request.json();

    if (!email || !productId) {
      return NextResponse.json({ error: 'Email and Product ID are required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc('find_auto_apply_coupon', {
      customer_email_param: email,
      product_id_param: productId
    });

    if (error) {
      console.error('Auto-apply lookup error:', error);
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Auto-apply API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
