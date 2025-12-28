import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe/server';
import { rateLimit, getClientIdentifier, createRateLimitHeaders } from '@/lib/rate-limit';

/**
 * POST /api/update-payment-metadata
 *
 * Updates Payment Intent metadata with invoice/company data
 * before the payment is confirmed.
 *
 * SECURITY:
 * - CORS protection: only same-origin requests allowed
 * - Rate limiting: 10 requests per minute per IP (higher than GUS because this is critical for payment flow)
 *
 * This is necessary because the PaymentIntent is created before
 * the user fills in invoice details.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. CORS Protection - Only allow same-origin requests
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    const allowedOrigins = [
      `https://${host}`,
      `http://${host}`,
      process.env.NEXT_PUBLIC_SITE_URL,
    ].filter(Boolean);

    const isValidOrigin = origin && allowedOrigins.some(allowed =>
      origin === allowed || (allowed ? origin.startsWith(allowed) : false)
    );

    const isValidReferer = referer && allowedOrigins.some(allowed =>
      allowed ? referer.startsWith(allowed) : false
    );

    if (!isValidOrigin && !isValidReferer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Invalid origin'
        },
        { status: 403 }
      );
    }

    // 2. Rate Limiting - 10 requests per minute per IP
    const clientId = getClientIdentifier(request);
    const rateLimitResult = rateLimit(`update-payment:${clientId}`, {
      maxRequests: 10,
      windowMs: 60 * 1000,
    });

    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.'
        },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders,
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    // 3. Parse and validate request
    const {
      clientSecret,
      firstName,
      lastName,
      termsAccepted,
      needsInvoice,
      nip,
      companyName,
      address,
      city,
      postalCode,
      country,
    } = await request.json();

    if (!clientSecret) {
      return NextResponse.json(
        { success: false, error: 'Client secret is required' },
        {
          status: 400,
          headers: rateLimitHeaders
        }
      );
    }

    // Extract Payment Intent ID from client secret
    const paymentIntentId = clientSecret.split('_secret_')[0];

    const stripe = await getStripeServer();

    // Update Payment Intent with customer and invoice metadata
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        first_name: firstName || '',
        last_name: lastName || '',
        terms_accepted: termsAccepted ? 'true' : '',
        needs_invoice: needsInvoice ? 'true' : 'false',
        nip: nip || '',
        company_name: companyName || '',
        address: address || '',
        city: city || '',
        postal_code: postalCode || '',
        country: country || '',
      },
    });

    return NextResponse.json(
      { success: true },
      { headers: rateLimitHeaders }
    );
  } catch (error: any) {
    console.error('Error updating payment metadata:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update payment metadata',
      },
      { status: 500 }
    );
  }
}
