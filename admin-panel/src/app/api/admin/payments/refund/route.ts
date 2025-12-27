// app/api/admin/payments/refund/route.ts
// API endpoint for processing payment refunds

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getStripeServer } from '@/lib/stripe/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const stripe = await getStripeServer();

    // Initialize Supabase client with service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Extract and verify JWT token
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { transactionId, paymentIntentId, amount, reason } = await request.json();

    if (!transactionId || !paymentIntentId) {
      return NextResponse.json(
        { message: 'Transaction ID and Payment Intent ID are required' },
        { status: 400 }
      );
    }

    // Get transaction details from database
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.status !== 'completed') {
      return NextResponse.json(
        { message: 'Only completed transactions can be refunded' },
        { status: 400 }
      );
    }

    // Process refund through Stripe
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundData.amount = amount; // Amount in cents
    }

    if (reason) {
      refundData.reason = reason as Stripe.RefundCreateParams.Reason;
    }

    const refund = await stripe.refunds.create(refundData);

    // Update transaction status in database
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: 'refunded',
        refund_id: refund.id,
        refund_amount: refund.amount,
        refund_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return NextResponse.json(
        { message: 'Refund processed but failed to update database' },
        { status: 500 }
      );
    }

    // Log the refund action
    await supabase.from('admin_actions').insert({
      admin_id: user.id,
      action: 'refund_processed',
      target_type: 'payment_transaction',
      target_id: transactionId,
      details: {
        refund_id: refund.id,
        amount: refund.amount,
        reason: reason || null,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
      },
    });

  } catch (error) {
    console.error('Refund processing error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
