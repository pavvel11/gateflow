/**
 * Server-side tracking utilities for Facebook CAPI
 *
 * This module provides server-side conversion tracking that doesn't
 * depend on client-side consent cookies. It's used for tracking
 * Purchase and Lead events from server-side code (e.g., Stripe webhooks).
 *
 * IMPORTANT: Only conversion events (Purchase, Lead) should be sent
 * without client-side consent under legitimate interest legal basis.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { FBEventName, EcommerceItem } from './types';

/**
 * SHA256 hash for Facebook user data matching
 */
function sha256(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value.toLowerCase().trim())
    .digest('hex');
}

/**
 * Events that can be sent from server-side without explicit cookie consent
 * Based on legitimate interest legal basis (GDPR Art. 6(1)(f))
 */
const SERVER_SIDE_ALLOWED_EVENTS: FBEventName[] = ['Purchase', 'Lead'];

interface ServerTrackingData {
  eventName: FBEventName;
  eventId?: string;
  eventSourceUrl: string;
  value: number;
  currency: string;
  items: EcommerceItem[];
  orderId?: string;
  userEmail?: string;
  clientIp?: string;
  userAgent?: string;
}

interface TrackingResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  eventsReceived?: number;
  error?: string;
}

/**
 * Generate a unique event ID for deduplication
 */
export function generateServerEventId(): string {
  return crypto.randomUUID();
}

/**
 * Send a conversion event directly to Facebook CAPI from server-side
 *
 * This bypasses the API route and sends directly to Facebook Graph API.
 * It's designed to be called from server-side code like payment verification.
 *
 * Features:
 * - Respects send_conversions_without_consent setting from DB
 * - Only allows conversion events (Purchase, Lead) without consent
 * - Hashes user email for Facebook matching
 * - Uses server-collected IP/UA for better matching
 *
 * @param data - Tracking event data
 * @returns Promise with tracking result
 */
export async function trackServerSideConversion(
  data: ServerTrackingData
): Promise<TrackingResult> {
  // Only allow conversion events from server-side
  if (!SERVER_SIDE_ALLOWED_EVENTS.includes(data.eventName)) {
    return {
      success: false,
      skipped: true,
      reason: 'event_not_allowed_server_side',
    };
  }

  // Get configuration from database
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[FB CAPI Server] Missing Supabase configuration');
    return {
      success: false,
      error: 'Server configuration error',
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: config, error: configError } = await supabase
    .from('integrations_config')
    .select(
      'facebook_pixel_id, facebook_capi_token, facebook_test_event_code, fb_capi_enabled, send_conversions_without_consent'
    )
    .single();

  if (configError) {
    console.error('[FB CAPI Server] Config fetch error:', configError);
    return {
      success: false,
      error: 'Failed to fetch configuration',
    };
  }

  // Check if CAPI is enabled and configured
  if (
    !config?.fb_capi_enabled ||
    !config?.facebook_pixel_id ||
    !config?.facebook_capi_token
  ) {
    return {
      success: false,
      skipped: true,
      reason: 'capi_not_configured',
    };
  }

  // Check if server-side conversions without consent are allowed
  if (!config.send_conversions_without_consent) {
    return {
      success: false,
      skipped: true,
      reason: 'server_side_conversions_disabled',
    };
  }

  // Generate event ID if not provided
  const eventId = data.eventId || generateServerEventId();

  // Build user_data object with hashing
  const userData: Record<string, unknown> = {};

  // Add IP and User-Agent if available
  if (data.clientIp) {
    userData.client_ip_address = data.clientIp;
  }
  if (data.userAgent) {
    userData.client_user_agent = data.userAgent;
  }

  // Hash email if provided
  if (data.userEmail) {
    userData.em = [sha256(data.userEmail)];
  }

  // Build the event payload
  const eventPayload = {
    data: [
      {
        event_name: data.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: data.eventSourceUrl,
        action_source: 'website' as const,
        user_data: userData,
        custom_data: {
          currency: data.currency,
          value: data.value,
          content_ids: data.items.map((i) => i.item_id),
          content_name: data.items[0]?.item_name,
          content_type: 'product',
          ...(data.orderId && { order_id: data.orderId }),
        },
      },
    ],
    // Add test event code if configured
    ...(config.facebook_test_event_code && {
      test_event_code: config.facebook_test_event_code,
    }),
  };

  try {
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
      console.error('[FB CAPI Server] Facebook API error:', fbResult);
      return {
        success: false,
        error: fbResult.error?.message || 'Facebook API request failed',
      };
    }

    console.log(
      `[FB CAPI Server] ${data.eventName} event sent successfully:`,
      {
        eventId,
        value: data.value,
        currency: data.currency,
        eventsReceived: fbResult.events_received,
      }
    );

    return {
      success: true,
      eventsReceived: fbResult.events_received,
    };
  } catch (error) {
    console.error('[FB CAPI Server] Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to send event to Facebook',
    };
  }
}
