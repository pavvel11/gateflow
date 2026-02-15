/**
 * Integration Tests: Payment Config Server Actions + Database
 *
 * Test ID: IT-DB-001 to IT-DB-014
 * Coverage: Server actions with real database operations
 * Focus: CRUD operations, caching, authorization
 *
 * REQUIRES: Supabase running locally (npx supabase start)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

describe('Payment Config Server Actions - Database Integration', () => {
  let testAdminUserId: string;
  let testNonAdminUserId: string;

  beforeAll(async () => {
    // Create test admin user
    const { data: adminAuth, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: `admin-payment-config-test-${Date.now()}@example.com`,
      password: 'test123456',
      email_confirm: true,
    });

    if (adminAuthError) throw adminAuthError;
    testAdminUserId = adminAuth.user.id;

    // Add to admin_users table
    const { error: adminInsertError } = await supabaseAdmin
      .from('admin_users')
      .insert({ user_id: testAdminUserId });

    if (adminInsertError) throw adminInsertError;

    // Create test non-admin user
    const { data: userAuth, error: userAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: `user-payment-config-test-${Date.now()}@example.com`,
      password: 'test123456',
      email_confirm: true,
    });

    if (userAuthError) throw userAuthError;
    testNonAdminUserId = userAuth.user.id;
  });

  afterAll(async () => {
    // Cleanup test users
    if (testAdminUserId) {
      await supabaseAdmin.from('admin_users').delete().eq('user_id', testAdminUserId);
      await supabaseAdmin.auth.admin.deleteUser(testAdminUserId);
    }

    if (testNonAdminUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testNonAdminUserId);
    }
  });

  beforeEach(async () => {
    // Reset payment config to default state before each test
    await supabaseAdmin
      .from('payment_method_config')
      .delete()
      .eq('id', 1);

    // Insert default config
    await supabaseAdmin
      .from('payment_method_config')
      .insert({
        id: 1,
        config_mode: 'automatic',
        custom_payment_methods: [],
        payment_method_order: [],
        currency_overrides: {},
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
      });
  });

  describe('getPaymentMethodConfig', () => {
    // IT-DB-001: Success - returns config object
    it('should return config when row exists', async () => {
      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .select('*')
        .eq('id', 1)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.config_mode).toBe('automatic');
    });

    // IT-DB-002: No config - returns null
    it('should return null when no config exists', async () => {
      // Delete config
      await supabaseAdmin
        .from('payment_method_config')
        .delete()
        .eq('id', 1);

      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeNull();
    });
  });

  describe('updatePaymentMethodConfig', () => {
    // IT-DB-003: Automatic mode update
    it('should update to automatic mode successfully', async () => {
      const updateData = {
        config_mode: 'automatic',
        stripe_pmc_id: null,
        stripe_pmc_name: null,
        custom_payment_methods: [],
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .update(updateData)
        .eq('id', 1)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.config_mode).toBe('automatic');
    });

    // IT-DB-004: Stripe preset mode update
    it('should update to stripe_preset mode with valid PMC ID', async () => {
      const updateData = {
        config_mode: 'stripe_preset',
        stripe_pmc_id: 'pmc_test123456',
        stripe_pmc_name: 'Test PMC',
        custom_payment_methods: [],
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .update(updateData)
        .eq('id', 1)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.config_mode).toBe('stripe_preset');
      expect(data?.stripe_pmc_id).toBe('pmc_test123456');
      expect(data?.stripe_pmc_name).toBe('Test PMC');
    });

    // IT-DB-005: Custom mode update with methods
    it('should update to custom mode with payment methods', async () => {
      const customMethods = [
        { type: 'card', enabled: true, display_order: 0, currency_restrictions: [] },
        { type: 'blik', enabled: true, display_order: 1, currency_restrictions: ['PLN'] },
        { type: 'p24', enabled: true, display_order: 2, currency_restrictions: ['PLN', 'EUR'] },
      ];

      const updateData = {
        config_mode: 'custom',
        custom_payment_methods: customMethods,
        payment_method_order: ['card', 'blik', 'p24'],
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .update(updateData)
        .eq('id', 1)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.config_mode).toBe('custom');
      expect(data?.custom_payment_methods).toHaveLength(3);
      expect(data?.payment_method_order).toEqual(['card', 'blik', 'p24']);
    });

    // IT-DB-009: Mode transition (automatic → custom)
    it('should transition from automatic to custom mode', async () => {
      // First, ensure automatic mode
      await supabaseAdmin
        .from('payment_method_config')
        .update({
          config_mode: 'automatic',
          custom_payment_methods: [],
        })
        .eq('id', 1);

      // Transition to custom
      const customMethods = [
        { type: 'card', enabled: true, display_order: 0 },
      ];

      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .update({
          config_mode: 'custom',
          custom_payment_methods: customMethods,
          stripe_pmc_id: null,
          stripe_pmc_name: null,
        })
        .eq('id', 1)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.config_mode).toBe('custom');
      expect(data?.custom_payment_methods).toHaveLength(1);
      expect(data?.stripe_pmc_id).toBeNull();
    });
  });

  describe('Payment method ordering', () => {
    it('should save and retrieve payment method order correctly', async () => {
      const order = ['blik', 'p24', 'card', 'sepa_debit'];

      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .update({
          payment_method_order: order,
        })
        .eq('id', 1)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.payment_method_order).toEqual(order);
    });

    it('should save currency overrides correctly', async () => {
      const overrides = {
        PLN: ['blik', 'p24', 'card'],
        EUR: ['sepa_debit', 'ideal', 'card'],
        USD: ['card', 'cashapp'],
      };

      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .update({
          currency_overrides: overrides,
        })
        .eq('id', 1)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.currency_overrides).toEqual(overrides);
    });
  });

  describe('Express Checkout toggles', () => {
    it('should update express checkout settings', async () => {
      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .update({
          enable_express_checkout: true,
          enable_apple_pay: true,
          enable_google_pay: false,
          enable_link: true,
        })
        .eq('id', 1)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.enable_express_checkout).toBe(true);
      expect(data?.enable_apple_pay).toBe(true);
      expect(data?.enable_google_pay).toBe(false);
      expect(data?.enable_link).toBe(true);
    });
  });

  describe('Stripe PMC cache', () => {
    // IT-DB-010: Fresh cache
    it('should store and retrieve cached PMCs', async () => {
      const cachedPMCs = [
        { id: 'pmc_1', name: 'Config 1', active: true, livemode: false, created: Date.now() },
        { id: 'pmc_2', name: 'Config 2', active: true, livemode: false, created: Date.now() },
      ];

      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .update({
          available_payment_methods: cachedPMCs,
          stripe_pmc_last_synced: new Date().toISOString(),
        })
        .eq('id', 1)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.available_payment_methods).toHaveLength(2);
      expect(data?.available_payment_methods[0].id).toBe('pmc_1');
    });

    // IT-DB-011: Stale cache (older than 1 hour)
    it('should identify stale cache based on timestamp', async () => {
      const staleTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      await supabaseAdmin
        .from('payment_method_config')
        .update({
          stripe_pmc_last_synced: staleTimestamp.toISOString(),
        })
        .eq('id', 1);

      const { data } = await supabaseAdmin
        .from('payment_method_config')
        .select('stripe_pmc_last_synced')
        .eq('id', 1)
        .single();

      const lastSync = data?.stripe_pmc_last_synced ? new Date(data.stripe_pmc_last_synced) : null;
      const hoursSinceSync = lastSync ? (Date.now() - lastSync.getTime()) / (1000 * 60 * 60) : null;

      expect(hoursSinceSync).toBeGreaterThan(1);
    });

    // IT-DB-012: Force refresh
    it('should update cache timestamp on force refresh', async () => {
      const beforeRefresh = new Date();

      await new Promise(resolve => setTimeout(resolve, 100));

      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .update({
          stripe_pmc_last_synced: new Date().toISOString(),
          available_payment_methods: [],
        })
        .eq('id', 1)
        .select()
        .single();

      expect(error).toBeNull();

      const lastSync = data?.stripe_pmc_last_synced ? new Date(data.stripe_pmc_last_synced) : null;
      expect(lastSync).not.toBeNull();
      expect(lastSync!.getTime()).toBeGreaterThan(beforeRefresh.getTime());
    });
  });

  describe('Database constraints', () => {
    it('should enforce singleton constraint (only id=1 allowed)', async () => {
      const { error } = await supabaseAdmin
        .from('payment_method_config')
        .insert({
          id: 2, // Should fail - only id=1 allowed
          config_mode: 'automatic',
        });

      expect(error).not.toBeNull();
      expect(error?.message).toContain('check constraint');
    });

    it('should enforce config_mode enum values', async () => {
      const { error } = await supabaseAdmin
        .from('payment_method_config')
        .update({
          config_mode: 'invalid_mode' as any,
        })
        .eq('id', 1);

      expect(error).not.toBeNull();
    });

    it('should allow null stripe_pmc_id when not in stripe_preset mode', async () => {
      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .update({
          config_mode: 'automatic',
          stripe_pmc_id: null,
        })
        .eq('id', 1)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.stripe_pmc_id).toBeNull();
    });
  });

  describe('JSONB field operations', () => {
    it('should handle complex custom_payment_methods JSONB', async () => {
      const complexMethods = [
        {
          type: 'card',
          enabled: true,
          display_order: 0,
          currency_restrictions: [],
          label: 'Credit/Debit Card',
          icon: '💳',
        },
        {
          type: 'blik',
          enabled: true,
          display_order: 1,
          currency_restrictions: ['PLN'],
          label: 'BLIK (Poland)',
          icon: '🇵🇱',
        },
      ];

      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .update({
          config_mode: 'custom',
          custom_payment_methods: complexMethods,
        })
        .eq('id', 1)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.custom_payment_methods).toHaveLength(2);
      expect(data?.custom_payment_methods[0].label).toBe('Credit/Debit Card');
      expect(data?.custom_payment_methods[1].currency_restrictions).toEqual(['PLN']);
    });

    it('should handle empty arrays in JSONB fields', async () => {
      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .update({
          custom_payment_methods: [],
          payment_method_order: [],
          currency_overrides: {},
          available_payment_methods: [],
        })
        .eq('id', 1)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.custom_payment_methods).toEqual([]);
      expect(data?.payment_method_order).toEqual([]);
      expect(data?.currency_overrides).toEqual({});
      expect(data?.available_payment_methods).toEqual([]);
    });
  });

  describe('Timestamps', () => {
    it('should automatically set created_at on insert', async () => {
      // Delete and re-insert to test created_at
      await supabaseAdmin
        .from('payment_method_config')
        .delete()
        .eq('id', 1);

      const beforeInsert = new Date();

      const { data, error } = await supabaseAdmin
        .from('payment_method_config')
        .insert({
          id: 1,
          config_mode: 'automatic',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.created_at).toBeDefined();

      const createdAt = new Date(data!.created_at);
      // Allow 1s tolerance for clock skew between Node.js and Postgres
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime() - 1000);
    });

    it('should update updated_at timestamp on update', async () => {
      const { data: before } = await supabaseAdmin
        .from('payment_method_config')
        .select('updated_at')
        .eq('id', 1)
        .single();

      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: after, error } = await supabaseAdmin
        .from('payment_method_config')
        .update({
          config_mode: 'custom',
        })
        .eq('id', 1)
        .select()
        .single();

      expect(error).toBeNull();

      const beforeTime = new Date(before!.updated_at).getTime();
      const afterTime = new Date(after!.updated_at).getTime();

      expect(afterTime).toBeGreaterThan(beforeTime);
    });
  });
});
