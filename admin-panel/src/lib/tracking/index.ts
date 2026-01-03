/**
 * Tracking Module
 *
 * Provides unified tracking for GTM, Facebook Pixel, and Facebook CAPI
 * with automatic deduplication via shared event IDs.
 */

export { trackEvent, generateEventId } from './client';
export type {
  GA4EventName,
  FBEventName,
  EcommerceItem,
  TrackingEventData,
  TrackingConfig,
  TrackingConfigFromDB,
  FBCAPIRequestPayload,
} from './types';
