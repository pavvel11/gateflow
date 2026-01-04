/**
 * Tracking Module
 *
 * Provides unified tracking for GTM, Facebook Pixel, and Facebook CAPI
 * with automatic deduplication via shared event IDs.
 *
 * Client-side: Use trackEvent() for browser tracking (respects Klaro consent)
 * Server-side: Use trackServerSideConversion() for server-side CAPI (requires send_conversions_without_consent)
 */

// Client-side tracking (requires browser context)
export { trackEvent, generateEventId, hasFacebookConsent, hasGTMConsent } from './client';

// Server-side tracking (for API routes, webhooks, etc.)
export { trackServerSideConversion, generateServerEventId } from './server';

export type {
  GA4EventName,
  FBEventName,
  EcommerceItem,
  TrackingEventData,
  TrackingConfig,
  TrackingConfigFromDB,
  FBCAPIRequestPayload,
} from './types';
