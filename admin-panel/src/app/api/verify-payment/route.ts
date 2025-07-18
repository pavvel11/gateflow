import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limiting';
import { verifyPaymentSession } from '@/lib/payment/verify-payment';

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();
    
    if (!session_id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get authenticated user (optional - can be null for guest purchases)
    const { data: { user } } = await supabase.auth.getUser();
    
    // Rate limiting - use user ID if available, otherwise use IP
    const rateLimitIdentifier = user?.id || 'anonymous';
    const rateLimitOk = await checkRateLimit('verify_payment', 10, 60, rateLimitIdentifier);
    
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Use the unified payment verification function
    const result = await verifyPaymentSession(session_id, user);

    // Handle errors
    if (result.error) {
      if (result.error === 'Invalid session ID') {
        return NextResponse.json(result, { status: 400 });
      }
      if (result.error === 'Session does not belong to current user') {
        return NextResponse.json(result, { status: 403 });
      }
      if (result.error === 'Session not found') {
        return NextResponse.json(result, { status: 404 });
      }
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Payment verification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
