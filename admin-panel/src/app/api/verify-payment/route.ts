import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';
import { checkRateLimit } from '@/lib/rate-limiting';

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
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitOk = await checkRateLimit('verify_payment', 10, 60, user.id);
    
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get Stripe instance
    const stripe = getStripeServer();
    
    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'payment_intent']
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if session belongs to current user
    if (session.metadata?.user_id && session.metadata.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Session does not belong to current user' },
        { status: 403 }
      );
    }

    // Return session status and details
    const response = {
      session_id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      amount_total: session.amount_total,
      currency: session.currency,
      metadata: session.metadata,
      created: session.created,
      expires_at: session.expires_at,
    };

    // If payment is complete, grant access
    if (session.status === 'complete' && session.payment_status === 'paid') {
      const productId = session.metadata?.product_id;
      const productSlug = session.metadata?.product_slug;
      
      if (productId && productSlug) {
        try {
          // Get product details
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, name, slug, auto_grant_duration_days')
            .eq('id', productId)
            .single();

          if (productError || !product) {
            console.error('Product not found:', productError);
            return NextResponse.json({
              ...response,
              access_granted: false,
              error: 'Product not found'
            });
          }

          // Check if access already exists
          const { data: existingAccess } = await supabase
            .from('user_product_access')
            .select('access_expires_at')
            .eq('user_id', user.id)
            .eq('product_id', productId)
            .single();

          if (existingAccess) {
            const expiresAt = existingAccess.access_expires_at 
              ? new Date(existingAccess.access_expires_at) 
              : null;
            const isExpired = expiresAt && expiresAt < new Date();
            
            if (!isExpired) {
              return NextResponse.json({
                ...response,
                access_granted: true,
                already_had_access: true
              });
            }
          }

          // Calculate access expiry
          let accessExpiresAt: string | null = null;
          if (product.auto_grant_duration_days) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + product.auto_grant_duration_days);
            accessExpiresAt = expiryDate.toISOString();
          }

          // Grant access
          const { error: accessError } = await supabase
            .from('user_product_access')
            .upsert({
              user_id: user.id,
              product_id: productId,
              access_granted_at: new Date().toISOString(),
              access_expires_at: accessExpiresAt,
              access_duration_days: product.auto_grant_duration_days,
            }, {
              onConflict: 'user_id,product_id'
            });

          if (accessError) {
            console.error('Error granting access:', accessError);
            return NextResponse.json({
              ...response,
              access_granted: false,
              error: 'Failed to grant access'
            });
          }

          return NextResponse.json({
            ...response,
            access_granted: true,
            already_had_access: false,
            access_expires_at: accessExpiresAt
          });

        } catch (error) {
          console.error('Error processing payment completion:', error);
          return NextResponse.json({
            ...response,
            access_granted: false,
            error: 'Failed to process payment completion'
          });
        }
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Payment verification error:', error);
    
    // Handle Stripe errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string };
      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          { error: 'Invalid session ID' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
