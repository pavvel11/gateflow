/**
 * Unit tests for trackServerSideConversion function
 *
 * Tests the server-side Facebook CAPI conversion tracking logic including:
 * - Event type filtering (only Purchase/Lead allowed)
 * - Configuration validation (Supabase env vars, CAPI settings)
 * - Consent checking (send_conversions_without_consent)
 * - Facebook Graph API payload construction and sending
 * - Error handling for API failures and network errors
 *
 * @see admin-panel/src/lib/tracking/server.ts
 * @see admin-panel/src/lib/tracking/types.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

// ===== MOCKS =====

const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockSingle = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// ===== HELPERS =====

/** Expected SHA256 hash of a lowercase-trimmed email */
function expectedSha256(email: string): string {
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');
}

/** Default valid integrations_config returned by Supabase mock */
function createDefaultConfig(overrides: Record<string, unknown> = {}) {
  return {
    fb_capi_enabled: true,
    facebook_pixel_id: '123456789',
    facebook_capi_token: 'test_capi_token_abc',
    facebook_test_event_code: null,
    send_conversions_without_consent: true,
    ...overrides,
  };
}

/** Default valid ServerTrackingData for a Purchase event */
function createDefaultTrackingData(overrides: Record<string, unknown> = {}) {
  return {
    eventName: 'Purchase' as const,
    eventSourceUrl: 'https://example.com/p/test-product',
    value: 49.99,
    currency: 'PLN',
    items: [{ item_id: 'prod_1', item_name: 'Test Product', price: 49.99, quantity: 1 }],
    orderId: 'order_123',
    userEmail: 'test@example.com',
    clientIp: '1.2.3.4',
    userAgent: 'Mozilla/5.0 Test',
    ...overrides,
  };
}

/** Configure the Supabase mock to return a given config or error */
function setupSupabaseMock(
  config: Record<string, unknown> | null,
  error: Record<string, unknown> | null = null
) {
  mockSelect.mockReturnValue({ single: mockSingle });
  mockSingle.mockResolvedValue({ data: config, error });
}

/** Configure global.fetch to return a given JSON response */
function setupFetchMock(
  body: Record<string, unknown>,
  ok = true,
  status = 200
) {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

// ===== TEST SUITE =====

describe('trackServerSideConversion', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // Lazy import so mocks are applied before the module loads
  async function getTrackFn() {
    const mod = await import('@/lib/tracking/server');
    return mod.trackServerSideConversion;
  }

  // ----- Event type filtering -----

  describe('event type filtering', () => {
    it('should reject ViewContent events with event_not_allowed_server_side', async () => {
      const trackServerSideConversion = await getTrackFn();
      const result = await trackServerSideConversion(
        createDefaultTrackingData({ eventName: 'ViewContent' })
      );

      expect(result).toEqual({
        success: false,
        skipped: true,
        reason: 'event_not_allowed_server_side',
      });
    });

    it('should reject InitiateCheckout events with event_not_allowed_server_side', async () => {
      const trackServerSideConversion = await getTrackFn();
      const result = await trackServerSideConversion(
        createDefaultTrackingData({ eventName: 'InitiateCheckout' })
      );

      expect(result).toEqual({
        success: false,
        skipped: true,
        reason: 'event_not_allowed_server_side',
      });
    });

    it('should reject AddPaymentInfo events with event_not_allowed_server_side', async () => {
      const trackServerSideConversion = await getTrackFn();
      const result = await trackServerSideConversion(
        createDefaultTrackingData({ eventName: 'AddPaymentInfo' })
      );

      expect(result).toEqual({
        success: false,
        skipped: true,
        reason: 'event_not_allowed_server_side',
      });
    });

    it('should allow Purchase events', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(createDefaultConfig());
      setupFetchMock({ events_received: 1 });

      const result = await trackServerSideConversion(
        createDefaultTrackingData({ eventName: 'Purchase' })
      );

      expect(result.success).toBe(true);
    });

    it('should allow Lead events', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(createDefaultConfig());
      setupFetchMock({ events_received: 1 });

      const result = await trackServerSideConversion(
        createDefaultTrackingData({ eventName: 'Lead' })
      );

      expect(result.success).toBe(true);
    });
  });

  // ----- Environment configuration -----

  describe('environment configuration', () => {
    it('should return error when SUPABASE_URL is missing', async () => {
      delete process.env.SUPABASE_URL;
      const trackServerSideConversion = await getTrackFn();

      const result = await trackServerSideConversion(createDefaultTrackingData());

      expect(result).toEqual({
        success: false,
        error: 'Server configuration error',
      });
    });

    it('should return error when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      const trackServerSideConversion = await getTrackFn();

      const result = await trackServerSideConversion(createDefaultTrackingData());

      expect(result).toEqual({
        success: false,
        error: 'Server configuration error',
      });
    });
  });

  // ----- CAPI configuration checks -----

  describe('CAPI configuration checks', () => {
    it('should return capi_not_configured when fb_capi_enabled is false', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(createDefaultConfig({ fb_capi_enabled: false }));

      const result = await trackServerSideConversion(createDefaultTrackingData());

      expect(result).toEqual({
        success: false,
        skipped: true,
        reason: 'capi_not_configured',
      });
    });

    it('should return capi_not_configured when facebook_pixel_id is missing', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(createDefaultConfig({ facebook_pixel_id: null }));

      const result = await trackServerSideConversion(createDefaultTrackingData());

      expect(result).toEqual({
        success: false,
        skipped: true,
        reason: 'capi_not_configured',
      });
    });

    it('should return capi_not_configured when facebook_capi_token is missing', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(createDefaultConfig({ facebook_capi_token: null }));

      const result = await trackServerSideConversion(createDefaultTrackingData());

      expect(result).toEqual({
        success: false,
        skipped: true,
        reason: 'capi_not_configured',
      });
    });

    it('should return error when Supabase config fetch fails', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(null, { message: 'relation does not exist', code: '42P01' });

      const result = await trackServerSideConversion(createDefaultTrackingData());

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch configuration',
      });
    });
  });

  // ----- Consent settings -----

  describe('consent settings', () => {
    it('should return server_side_conversions_disabled when send_conversions_without_consent is false', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(createDefaultConfig({ send_conversions_without_consent: false }));

      const result = await trackServerSideConversion(createDefaultTrackingData());

      expect(result).toEqual({
        success: false,
        skipped: true,
        reason: 'server_side_conversions_disabled',
      });
    });
  });

  // ----- Facebook API payload -----

  describe('Facebook API payload', () => {
    it('should send correct payload to Facebook Graph API', async () => {
      const trackServerSideConversion = await getTrackFn();
      const config = createDefaultConfig();
      setupSupabaseMock(config);
      setupFetchMock({ events_received: 1 });

      const data = createDefaultTrackingData({ eventId: 'evt_fixed_123' });
      await trackServerSideConversion(data);

      expect(global.fetch).toHaveBeenCalledOnce();

      const [url, options] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toBe(
        `https://graph.facebook.com/v18.0/${config.facebook_pixel_id}/events?access_token=${config.facebook_capi_token}`
      );
      expect(options?.method).toBe('POST');
      expect(options?.headers).toEqual({ 'Content-Type': 'application/json' });

      const body = JSON.parse(options?.body as string);
      expect(body.data).toHaveLength(1);

      const event = body.data[0];
      expect(event.event_name).toBe('Purchase');
      expect(event.event_id).toBe('evt_fixed_123');
      expect(event.event_source_url).toBe('https://example.com/p/test-product');
      expect(event.action_source).toBe('website');
      expect(event.event_time).toBeTypeOf('number');

      // user_data
      expect(event.user_data.client_ip_address).toBe('1.2.3.4');
      expect(event.user_data.client_user_agent).toBe('Mozilla/5.0 Test');
      expect(event.user_data.em).toEqual([expectedSha256('test@example.com')]);

      // custom_data
      expect(event.custom_data.currency).toBe('PLN');
      expect(event.custom_data.value).toBe(49.99);
      expect(event.custom_data.content_ids).toEqual(['prod_1']);
      expect(event.custom_data.content_name).toBe('Test Product');
      expect(event.custom_data.content_type).toBe('product');
      expect(event.custom_data.order_id).toBe('order_123');
    });

    it('should hash email correctly with SHA256 lowercase', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(createDefaultConfig());
      setupFetchMock({ events_received: 1 });

      const data = createDefaultTrackingData({
        eventId: 'evt_hash_test',
        userEmail: '  Test@EXAMPLE.COM  ',
      });
      await trackServerSideConversion(data);

      const body = JSON.parse(
        vi.mocked(global.fetch).mock.calls[0][1]?.body as string
      );
      const hashedEmail = body.data[0].user_data.em[0];

      // sha256 of "test@example.com" (lowercased and trimmed)
      expect(hashedEmail).toBe(expectedSha256('test@example.com'));
      expect(hashedEmail).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should include test_event_code when configured', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(
        createDefaultConfig({ facebook_test_event_code: 'TEST12345' })
      );
      setupFetchMock({ events_received: 1 });

      await trackServerSideConversion(
        createDefaultTrackingData({ eventId: 'evt_test_code' })
      );

      const body = JSON.parse(
        vi.mocked(global.fetch).mock.calls[0][1]?.body as string
      );
      expect(body.test_event_code).toBe('TEST12345');
    });

    it('should not include test_event_code when not configured', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(
        createDefaultConfig({ facebook_test_event_code: null })
      );
      setupFetchMock({ events_received: 1 });

      await trackServerSideConversion(
        createDefaultTrackingData({ eventId: 'evt_no_test_code' })
      );

      const body = JSON.parse(
        vi.mocked(global.fetch).mock.calls[0][1]?.body as string
      );
      expect(body.test_event_code).toBeUndefined();
    });

    it('should use provided event_id', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(createDefaultConfig());
      setupFetchMock({ events_received: 1 });

      await trackServerSideConversion(
        createDefaultTrackingData({ eventId: 'custom_event_id_xyz' })
      );

      const body = JSON.parse(
        vi.mocked(global.fetch).mock.calls[0][1]?.body as string
      );
      expect(body.data[0].event_id).toBe('custom_event_id_xyz');
    });

    it('should generate event_id when not provided', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(createDefaultConfig());
      setupFetchMock({ events_received: 1 });

      await trackServerSideConversion(
        createDefaultTrackingData({ eventId: undefined })
      );

      const body = JSON.parse(
        vi.mocked(global.fetch).mock.calls[0][1]?.body as string
      );
      // Should be a valid UUID (generated by crypto.randomUUID)
      expect(body.data[0].event_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });
  });

  // ----- Success response -----

  describe('success response', () => {
    it('should return success with eventsReceived count', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(createDefaultConfig());
      setupFetchMock({ events_received: 1 });

      const result = await trackServerSideConversion(createDefaultTrackingData());

      expect(result).toEqual({
        success: true,
        eventsReceived: 1,
      });
    });
  });

  // ----- Error handling -----

  describe('error handling', () => {
    it('should handle Facebook API error response', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(createDefaultConfig());
      setupFetchMock(
        {
          error: {
            message: 'Invalid OAuth access token',
            type: 'OAuthException',
            code: 190,
          },
        },
        false,
        401
      );

      const result = await trackServerSideConversion(createDefaultTrackingData());

      expect(result).toEqual({
        success: false,
        error: 'Invalid OAuth access token',
      });
    });

    it('should handle Facebook API error without message field', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(createDefaultConfig());
      setupFetchMock({ error: {} }, false, 500);

      const result = await trackServerSideConversion(createDefaultTrackingData());

      expect(result).toEqual({
        success: false,
        error: 'Facebook API request failed',
      });
    });

    it('should handle fetch network error', async () => {
      const trackServerSideConversion = await getTrackFn();
      setupSupabaseMock(createDefaultConfig());
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const result = await trackServerSideConversion(createDefaultTrackingData());

      expect(result).toEqual({
        success: false,
        error: 'Failed to send event to Facebook',
      });
    });
  });
});
