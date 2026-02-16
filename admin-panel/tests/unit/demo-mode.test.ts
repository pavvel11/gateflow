/**
 * Demo Mode Unit Tests
 *
 * Tests for:
 * 1. isDemoMode() utility
 * 2. Proxy demo blocking logic (whitelist-only)
 * 3. Server action guards (throw + return patterns)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// 1. isDemoMode() utility
// =============================================================================

describe('isDemoMode()', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns false when DEMO_MODE is not set', async () => {
    delete process.env.DEMO_MODE;
    const { isDemoMode } = await import('@/lib/demo-guard');
    expect(isDemoMode()).toBe(false);
  });

  it('returns false when DEMO_MODE is "false"', async () => {
    process.env.DEMO_MODE = 'false';
    const { isDemoMode } = await import('@/lib/demo-guard');
    expect(isDemoMode()).toBe(false);
  });

  it('returns true when DEMO_MODE is "true"', async () => {
    process.env.DEMO_MODE = 'true';
    const { isDemoMode } = await import('@/lib/demo-guard');
    expect(isDemoMode()).toBe(true);
  });

  it('exports DEMO_MODE_ERROR constant', async () => {
    const { DEMO_MODE_ERROR } = await import('@/lib/demo-guard');
    expect(DEMO_MODE_ERROR).toBe('This action is disabled in demo mode');
  });
});

// =============================================================================
// 2. Proxy demo blocking logic
// =============================================================================

// Extract the pure logic from proxy.ts for unit testing
// We replicate the whitelist + isDemoBlocked logic here to test it in isolation

const DEMO_MUTATION_ALLOWED = [
  '/api/create-payment-intent',
  '/api/verify-payment',
  '/api/create-embedded-checkout',
  '/api/update-payment-metadata',
  '/api/webhooks/',
  '/api/auth/',
  '/api/public/',
  '/api/coupons/',
  '/api/order-bumps/',
  '/api/gus/',
  '/api/validate-email',
  '/api/health',
  '/api/status',
  '/api/config',
  '/api/runtime-config',
  '/api/consent',
  '/api/tracking/',
  '/api/waitlist/',
  '/api/gatekeeper',
  '/api/gateflow-embed',
  '/api/oto/',
  '/api/products/',
  '/api/access',
  '/api/profile/',
  '/api/users/',
  '/api/refund-requests',
];

function isDemoBlocked(demoMode: boolean, pathname: string, method: string): boolean {
  if (!demoMode) return false;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  return !DEMO_MUTATION_ALLOWED.some(p => pathname.startsWith(p));
}

describe('Proxy demo blocking (whitelist-only)', () => {

  describe('when DEMO_MODE is off', () => {
    it('allows all requests', () => {
      expect(isDemoBlocked(false, '/api/admin/products', 'POST')).toBe(false);
      expect(isDemoBlocked(false, '/api/v1/products', 'DELETE')).toBe(false);
      expect(isDemoBlocked(false, '/api/v1/webhooks/123', 'PUT')).toBe(false);
    });
  });

  describe('when DEMO_MODE is on', () => {

    // --- GET always allowed ---
    it('allows GET on any route', () => {
      expect(isDemoBlocked(true, '/api/admin/products', 'GET')).toBe(false);
      expect(isDemoBlocked(true, '/api/v1/users', 'GET')).toBe(false);
      expect(isDemoBlocked(true, '/api/v1/analytics/dashboard', 'GET')).toBe(false);
    });

    it('allows HEAD and OPTIONS on any route', () => {
      expect(isDemoBlocked(true, '/api/admin/products', 'HEAD')).toBe(false);
      expect(isDemoBlocked(true, '/api/v1/products', 'OPTIONS')).toBe(false);
    });

    // --- Blocked mutations (not on whitelist) ---
    it('blocks POST to /api/admin/*', () => {
      expect(isDemoBlocked(true, '/api/admin/products', 'POST')).toBe(true);
      expect(isDemoBlocked(true, '/api/admin/coupons', 'POST')).toBe(true);
      expect(isDemoBlocked(true, '/api/admin/webhooks', 'POST')).toBe(true);
    });

    it('blocks DELETE to /api/admin/*', () => {
      expect(isDemoBlocked(true, '/api/admin/products/123', 'DELETE')).toBe(true);
      expect(isDemoBlocked(true, '/api/admin/coupons/456', 'DELETE')).toBe(true);
    });

    it('blocks PUT/PATCH to /api/admin/*', () => {
      expect(isDemoBlocked(true, '/api/admin/products/123', 'PUT')).toBe(true);
      expect(isDemoBlocked(true, '/api/admin/products/123', 'PATCH')).toBe(true);
    });

    it('blocks mutations to /api/v1/*', () => {
      expect(isDemoBlocked(true, '/api/v1/products', 'POST')).toBe(true);
      expect(isDemoBlocked(true, '/api/v1/products/123', 'DELETE')).toBe(true);
      expect(isDemoBlocked(true, '/api/v1/coupons/123', 'PATCH')).toBe(true);
      expect(isDemoBlocked(true, '/api/v1/webhooks', 'POST')).toBe(true);
      expect(isDemoBlocked(true, '/api/v1/api-keys', 'POST')).toBe(true);
      expect(isDemoBlocked(true, '/api/v1/api-keys/123/rotate', 'POST')).toBe(true);
    });

    // --- Whitelisted mutations (checkout flow) ---
    it('allows POST to checkout routes', () => {
      expect(isDemoBlocked(true, '/api/create-payment-intent', 'POST')).toBe(false);
      expect(isDemoBlocked(true, '/api/verify-payment', 'POST')).toBe(false);
      expect(isDemoBlocked(true, '/api/create-embedded-checkout', 'POST')).toBe(false);
      expect(isDemoBlocked(true, '/api/update-payment-metadata', 'POST')).toBe(false);
    });

    it('allows POST to Stripe webhook', () => {
      expect(isDemoBlocked(true, '/api/webhooks/stripe', 'POST')).toBe(false);
    });

    it('allows POST to auth routes', () => {
      expect(isDemoBlocked(true, '/api/auth/logout', 'POST')).toBe(false);
    });

    it('allows POST to public routes', () => {
      expect(isDemoBlocked(true, '/api/public/products/slug/grant-access', 'POST')).toBe(false);
      expect(isDemoBlocked(true, '/api/public/products/claim-free', 'POST')).toBe(false);
    });

    it('allows POST to consent/tracking/waitlist', () => {
      expect(isDemoBlocked(true, '/api/consent', 'POST')).toBe(false);
      expect(isDemoBlocked(true, '/api/tracking/fb-capi', 'POST')).toBe(false);
      expect(isDemoBlocked(true, '/api/waitlist/signup', 'POST')).toBe(false);
    });

    // --- Unknown/new endpoints blocked by default ---
    it('blocks mutations to unknown API routes (secure by default)', () => {
      expect(isDemoBlocked(true, '/api/some-new-endpoint', 'POST')).toBe(true);
      expect(isDemoBlocked(true, '/api/dangerous/delete-all', 'DELETE')).toBe(true);
      expect(isDemoBlocked(true, '/api/future/feature', 'PUT')).toBe(true);
    });
  });
});

// =============================================================================
// 3. Server action guards
// =============================================================================

describe('Server action demo guards', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, DEMO_MODE: 'true' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // --- Throw-pattern actions ---

  describe('categories (throw pattern)', () => {
    it('createCategory throws in demo mode', async () => {
      // Mock supabase so the action doesn't actually connect
      vi.mock('@/lib/supabase/server', () => ({
        createClient: vi.fn(),
      }));

      const { createCategory } = await import('@/lib/actions/categories');
      await expect(createCategory({ name: 'Test', slug: 'test' }))
        .rejects.toThrow('This action is disabled in demo mode');
    });

    it('updateCategory throws in demo mode', async () => {
      const { updateCategory } = await import('@/lib/actions/categories');
      await expect(updateCategory('123', { name: 'Test', slug: 'test' }))
        .rejects.toThrow('This action is disabled in demo mode');
    });

    it('deleteCategory throws in demo mode', async () => {
      const { deleteCategory } = await import('@/lib/actions/categories');
      await expect(deleteCategory('123'))
        .rejects.toThrow('This action is disabled in demo mode');
    });

    it('updateProductCategories throws in demo mode', async () => {
      const { updateProductCategories } = await import('@/lib/actions/categories');
      await expect(updateProductCategories('prod-1', ['cat-1']))
        .rejects.toThrow('This action is disabled in demo mode');
    });
  });

  describe('preferences (throw pattern)', () => {
    it('updateUserPreferences throws in demo mode', async () => {
      vi.mock('@/lib/supabase/server', () => ({
        createClient: vi.fn(),
      }));

      const { updateUserPreferences } = await import('@/lib/actions/preferences');
      await expect(updateUserPreferences({ hideValues: true }))
        .rejects.toThrow('This action is disabled in demo mode');
    });
  });

  // --- Return-pattern actions ---

  describe('currency-config (return pattern)', () => {
    it('saveCurrencyConfig returns error in demo mode', async () => {
      vi.mock('@/lib/supabase/server', () => ({
        createClient: vi.fn(),
      }));
      vi.mock('@/lib/services/currency-encryption', () => ({
        encryptCurrencyKey: vi.fn(),
        decryptCurrencyKey: vi.fn(),
      }));

      const { saveCurrencyConfig } = await import('@/lib/actions/currency-config');
      const result = await saveCurrencyConfig({ provider: 'ecb', enabled: true });
      expect(result).toEqual({
        success: false,
        error: 'This action is disabled in demo mode',
        errorCode: 'DEMO_MODE',
      });
    });

    it('deleteCurrencyConfig returns error in demo mode', async () => {
      const { deleteCurrencyConfig } = await import('@/lib/actions/currency-config');
      const result = await deleteCurrencyConfig();
      expect(result).toEqual({
        success: false,
        error: 'This action is disabled in demo mode',
        errorCode: 'DEMO_MODE',
      });
    });
  });

  describe('integrations (return pattern)', () => {
    it('updateIntegrationsConfig returns error in demo mode', async () => {
      vi.mock('@/lib/supabase/server', () => ({
        createClient: vi.fn(),
        createPublicClient: vi.fn(),
      }));
      vi.mock('@/lib/validations/integrations', () => ({
        validateIntegrations: vi.fn(),
        validateScript: vi.fn(),
      }));
      vi.mock('@/lib/license/verify', () => ({
        validateLicense: vi.fn(),
        extractDomainFromUrl: vi.fn(),
      }));

      const { updateIntegrationsConfig } = await import('@/lib/actions/integrations');
      const result = await updateIntegrationsConfig({} as any);
      expect(result).toEqual({ error: 'This action is disabled in demo mode' });
    });

    it('addScript returns error in demo mode', async () => {
      const { addScript } = await import('@/lib/actions/integrations');
      const result = await addScript({} as any);
      expect(result).toEqual({ error: 'This action is disabled in demo mode' });
    });

    it('deleteScript returns error in demo mode', async () => {
      const { deleteScript } = await import('@/lib/actions/integrations');
      const result = await deleteScript('123');
      expect(result).toEqual({ error: 'This action is disabled in demo mode' });
    });

    it('toggleScript returns error in demo mode', async () => {
      const { toggleScript } = await import('@/lib/actions/integrations');
      const result = await toggleScript('123', true);
      expect(result).toEqual({ error: 'This action is disabled in demo mode' });
    });
  });

  describe('stripe-config (return pattern)', () => {
    it('saveStripeConfig returns error in demo mode', async () => {
      vi.mock('@/lib/supabase/server', () => ({
        createClient: vi.fn(),
      }));
      vi.mock('@/lib/services/stripe-encryption', () => ({
        encryptStripeKey: vi.fn(),
        decryptStripeKey: vi.fn(),
      }));
      vi.mock('stripe', () => ({ default: vi.fn() }));

      const { saveStripeConfig } = await import('@/lib/actions/stripe-config');
      const result = await saveStripeConfig({ apiKey: 'sk_test_xxx', mode: 'test' });
      expect(result).toEqual({
        success: false,
        error: 'This action is disabled in demo mode',
        errorCode: 'DEMO_MODE',
      });
    });

    it('deleteStripeConfig returns error in demo mode', async () => {
      const { deleteStripeConfig } = await import('@/lib/actions/stripe-config');
      const result = await deleteStripeConfig('123');
      expect(result).toEqual({
        success: false,
        error: 'This action is disabled in demo mode',
        errorCode: 'DEMO_MODE',
      });
    });
  });

  describe('gus-config (return pattern)', () => {
    it('saveGUSAPIKey returns error in demo mode', async () => {
      vi.mock('@/lib/supabase/server', () => ({
        createClient: vi.fn(),
      }));
      vi.mock('@/lib/services/gus-encryption', () => ({
        encryptGUSKey: vi.fn(),
        decryptGUSKey: vi.fn(),
      }));

      const { saveGUSAPIKey } = await import('@/lib/actions/gus-config');
      const result = await saveGUSAPIKey({ apiKey: 'test-key-12345', enabled: true });
      expect(result).toEqual({
        success: false,
        error: 'This action is disabled in demo mode',
        errorCode: 'DEMO_MODE',
      });
    });

    it('deleteGUSAPIKey returns error in demo mode', async () => {
      const { deleteGUSAPIKey } = await import('@/lib/actions/gus-config');
      const result = await deleteGUSAPIKey();
      expect(result).toEqual({
        success: false,
        error: 'This action is disabled in demo mode',
        errorCode: 'DEMO_MODE',
      });
    });
  });

  describe('payment-config (return pattern)', () => {
    it('updatePaymentMethodConfig returns error in demo mode', async () => {
      vi.mock('@/lib/supabase/server', () => ({
        createClient: vi.fn(),
      }));
      vi.mock('@/lib/stripe/payment-method-configs', () => ({
        fetchStripePaymentMethodConfigs: vi.fn(),
        fetchStripePaymentMethodConfig: vi.fn(),
        isValidStripePMCId: vi.fn(),
      }));
      vi.mock('@/lib/utils/payment-method-helpers', () => ({
        RECOMMENDED_CONFIG: {},
      }));

      const { updatePaymentMethodConfig } = await import('@/lib/actions/payment-config');
      const result = await updatePaymentMethodConfig({ config_mode: 'automatic' } as any);
      expect(result).toEqual({
        success: false,
        error: 'This action is disabled in demo mode',
        errorCode: 'DEMO_MODE',
      });
    });

    it('resetToRecommendedConfig returns error in demo mode', async () => {
      const { resetToRecommendedConfig } = await import('@/lib/actions/payment-config');
      const result = await resetToRecommendedConfig();
      expect(result).toEqual({
        success: false,
        error: 'This action is disabled in demo mode',
        errorCode: 'DEMO_MODE',
      });
    });
  });

  describe('profile (return pattern)', () => {
    it('updateProfile returns error in demo mode', async () => {
      vi.mock('@/lib/supabase/server', () => ({
        createClient: vi.fn(),
      }));
      vi.mock('@/lib/validations/profile', () => ({
        validateProfile: vi.fn(),
      }));

      const { updateProfile } = await import('@/lib/actions/profile');
      const result = await updateProfile({} as any);
      expect(result).toEqual({ error: 'This action is disabled in demo mode' });
    });
  });

  describe('shop-config (boolean pattern)', () => {
    it('updateShopConfig returns false in demo mode', async () => {
      vi.mock('@/lib/supabase/server', () => ({
        createClient: vi.fn(),
        createPublicClient: vi.fn(),
      }));
      vi.mock('@/lib/redis/cache', () => ({
        cacheGet: vi.fn(),
        cacheSet: vi.fn(),
        cacheDel: vi.fn(),
        CacheKeys: { SHOP_CONFIG: 'shop_config' },
        CacheTTL: { LONG: 3600 },
      }));

      const { updateShopConfig } = await import('@/lib/actions/shop-config');
      const result = await updateShopConfig({ shop_name: 'Test' });
      expect(result).toBe(false);
    });
  });
});
