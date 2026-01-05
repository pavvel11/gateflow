import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limiting';
import crypto from 'crypto';

/**
 * SHA256 hash for Facebook user data matching
 * Facebook requires user data to be hashed with SHA256 before sending
 */
function sha256(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value.toLowerCase().trim())
    .digest('hex');
}

/**
 * Events that can be sent without explicit cookie consent
 * Based on legitimate interest legal basis (GDPR Art. 6(1)(f))
 * Only conversion events - no browsing/tracking events
 */
const CONSENT_EXEMPT_EVENTS = ['Purchase', 'Lead'];

/**
 * Check if an event can be sent without consent
 */
function canSendWithoutConsent(
  eventName: string,
  hasConsent: boolean,
  sendConversionsWithoutConsent: boolean
): boolean {
  // If user has consent, always send
  if (hasConsent) return true;

  // If setting is disabled, don't send without consent
  if (!sendConversionsWithoutConsent) return false;

  // Only allow specific conversion events without consent
  return CONSENT_EXEMPT_EVENTS.includes(eventName);
}

/**
 * Facebook Conversions API endpoint
 *
 * Receives events from the frontend and forwards them to Facebook Graph API
 * with proper hashing and deduplication support.
 *
 * Supports two modes:
 * 1. With consent: Full tracking with cookies (_fbc, _fbp)
 * 2. Without consent: Only conversion events (Purchase, Lead) with hashed data only
 *
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 30 requests per minute per IP (generous for tracking)
    const rateLimitOk = await checkRateLimit('fb_capi', 30, 1);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many tracking requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.event_name || !body.event_id) {
      return NextResponse.json(
        { error: 'Missing required fields: event_name, event_id' },
        { status: 400 }
      );
    }

    // Get config from database
    const supabase = await createClient();
    const { data: config, error: configError } = await supabase
      .from('integrations_config')
      .select(
        'facebook_pixel_id, facebook_capi_token, facebook_test_event_code, fb_capi_enabled, send_conversions_without_consent'
      )
      .single();

    if (configError) {
      console.error('[FB CAPI] Config fetch error:', configError);
      return NextResponse.json(
        { error: 'Failed to fetch configuration' },
        { status: 500 }
      );
    }

    // Check if CAPI is enabled and configured
    if (
      !config?.fb_capi_enabled ||
      !config?.facebook_pixel_id ||
      !config?.facebook_capi_token
    ) {
      return NextResponse.json(
        { error: 'Facebook CAPI not configured or disabled' },
        { status: 400 }
      );
    }

    // Determine if user has consent (passed from frontend or server-side call)
    const hasConsent = body.has_consent ?? true; // Default to true for backwards compatibility
    const sendConversionsWithoutConsent = config.send_conversions_without_consent ?? false;

    // Check if we can send this event
    if (!canSendWithoutConsent(body.event_name, hasConsent, sendConversionsWithoutConsent)) {
      // User doesn't have consent and this event type cannot be sent without consent
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'no_consent',
        message: 'Event skipped: user has not given consent and event type requires consent',
      });
    }

    // Extract client info from headers
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '';
    const userAgent = request.headers.get('user-agent') || '';

    // Build user_data object with hashing
    const userData: Record<string, unknown> = {
      client_ip_address: clientIp,
      client_user_agent: userAgent,
    };

    // Hash email if provided
    if (body.user_email && typeof body.user_email === 'string') {
      userData.em = [sha256(body.user_email)];
    }

    // Only add Facebook cookies if user has consent
    // Without consent, we rely on hashed email + IP for matching (legitimate interest)
    if (hasConsent) {
      const fbc = request.cookies.get('_fbc')?.value;
      const fbp = request.cookies.get('_fbp')?.value;
      if (fbc) userData.fbc = fbc;
      if (fbp) userData.fbp = fbp;
    }

    // Build the event payload
    const eventPayload = {
      data: [
        {
          event_name: body.event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: body.event_id,
          event_source_url: body.event_source_url || '',
          action_source: 'website' as const,
          user_data: userData,
          custom_data: {
            currency: body.currency,
            value: body.value,
            content_ids: body.content_ids || [],
            content_name: body.content_name,
            content_type: 'product',
            ...(body.order_id && { order_id: body.order_id }),
          },
        },
      ],
      // Add test event code if configured (for testing in Events Manager)
      ...(config.facebook_test_event_code && {
        test_event_code: config.facebook_test_event_code,
      }),
    };

    // Send to Facebook Graph API
    const fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/${config.facebook_pixel_id}/events?access_token=${config.facebook_capi_token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload),
      }
    );

    const fbResult = await fbResponse.json();

    if (!fbResponse.ok) {
      console.error('[FB CAPI] Facebook API error:', fbResult);
      return NextResponse.json(
        {
          error: 'Facebook API request failed',
          details: fbResult.error?.message || 'Unknown error',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      events_received: fbResult.events_received,
    });
  } catch (error) {
    console.error('[FB CAPI] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
