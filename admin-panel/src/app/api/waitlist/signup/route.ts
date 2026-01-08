import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebhookService } from '@/lib/services/webhook-service';
import { checkRateLimit } from '@/lib/rate-limiting';

export async function POST(request: Request) {
  try {
    // Rate limiting: 5 requests per 5 minutes (prevents webhook spam)
    const rateLimitOk = await checkRateLimit('waitlist_signup', 5, 300);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again in a few minutes.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, productId, productSlug, captchaToken } = body;

    // Validate required fields
    if (!email || !productId) {
      return NextResponse.json(
        { error: 'Email and product ID are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Verify captcha in production
    if (process.env.NODE_ENV === 'production' && !captchaToken) {
      return NextResponse.json(
        { error: 'Security verification required' },
        { status: 400 }
      );
    }

    // Verify the captcha token with Cloudflare
    if (captchaToken && process.env.TURNSTILE_SECRET_KEY) {
      const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: captchaToken,
        }),
      });

      const verifyResult = await verifyResponse.json();
      if (!verifyResult.success) {
        return NextResponse.json(
          { error: 'Security verification failed' },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();

    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, slug, price, currency, icon, enable_waitlist')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Verify waitlist is enabled for this product
    if (!product.enable_waitlist) {
      return NextResponse.json(
        { error: 'Waitlist is not enabled for this product' },
        { status: 400 }
      );
    }

    // Trigger webhook for waitlist signup
    // Note: We're not storing in DB yet - that will be added later (see backlog)
    await WebhookService.trigger('waitlist.signup', {
      email,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug || productSlug,
        price: product.price,
        currency: product.currency,
        icon: product.icon,
      },
      signed_up_at: new Date().toISOString(),
    });

    // Log the signup for debugging (can be removed in production)
    console.log(`[Waitlist] New signup: ${email} for product ${product.name} (${product.id})`);

    return NextResponse.json({
      success: true,
      message: 'Successfully signed up for waitlist',
    });
  } catch (error) {
    console.error('[Waitlist] Error processing signup:', error);
    return NextResponse.json(
      { error: 'Failed to process waitlist signup' },
      { status: 500 }
    );
  }
}
