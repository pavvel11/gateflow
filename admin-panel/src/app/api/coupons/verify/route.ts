import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code, productId, email } = await request.json();

    if (!code || !productId) {
      return NextResponse.json({ error: 'Code and Product ID are required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Use the secure DB function to verify coupon
    // This handles all logic: active status, expiration, product/email matching, and usage limits
    const { data, error } = await supabase.rpc('verify_coupon', {
      code_param: code.toUpperCase(),
      product_id_param: productId,
      customer_email_param: email || null
    });

    if (error) {
      console.error('Coupon verification RPC error:', error);
      return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }

    // Return the result directly (JSONB from Postgres)
    return NextResponse.json(data);
  } catch (error) {
    console.error('Coupon verification API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
