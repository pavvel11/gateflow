import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CheckoutService } from '@/lib/services/checkout';
import { CheckoutError, CheckoutErrorType } from '@/types/checkout';
import type { CreateCheckoutRequest, CreateCheckoutResponse, CheckoutErrorResponse } from '@/types/checkout';

export async function POST(request: NextRequest): Promise<NextResponse<CreateCheckoutResponse | CheckoutErrorResponse>> {
  try {
    const supabase = await createClient();
    const requestData: CreateCheckoutRequest = await request.json();
    
    // Get authenticated user (optional for guest checkout)
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get origin for return URL
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL;
    
    // Use user's email from session if not provided in request
    const finalEmail = requestData.email || user?.email;
    
    // Create modified request with final email
    const finalRequestData = {
      ...requestData,
      email: finalEmail
    };
    
    // Create checkout service and process request
    const checkoutService = new CheckoutService();
    await checkoutService.initialize();
    
    // Get product for return URL
    const product = await checkoutService.getProduct(finalRequestData.productId);
    
    // Use the same return URL for both logged-in and guest users
    // The payment-status page will handle both scenarios intelligently
    const returnUrl = `${origin}/p/${product.slug}/payment-status?session_id={CHECKOUT_SESSION_ID}`;
    
    const result = await checkoutService.createCheckoutSession(
      finalRequestData,
      returnUrl,
      user?.id
    );
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Create embedded checkout error:', error);
    
    // Handle known checkout errors
    if (error instanceof CheckoutError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: error.statusCode }
      );
    }
    
    // Handle unexpected errors
    return NextResponse.json(
      { error: 'Failed to create checkout session', type: CheckoutErrorType.UNKNOWN_ERROR },
      { status: 500 }
    );
  }
}
