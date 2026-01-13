/**
 * Configuration Tests
 * Quick Vitest tests to ensure environment variables are properly loaded at runtime
 * and not hardcoded from build time.
 */

import { describe, it, expect } from 'vitest';

describe('Environment Variables Configuration', () => {
  describe('Supabase Configuration', () => {
    it('should have SUPABASE_URL defined', () => {
      expect(process.env.SUPABASE_URL).toBeDefined();
      expect(process.env.SUPABASE_URL).not.toBe('');
    });

    it('should NOT have placeholder Supabase URL', () => {
      expect(process.env.SUPABASE_URL).not.toContain('placeholder');
      expect(process.env.SUPABASE_URL).not.toBe('https://placeholder.supabase.co');
    });

    it('should have SUPABASE_ANON_KEY defined', () => {
      expect(process.env.SUPABASE_ANON_KEY).toBeDefined();
      expect(process.env.SUPABASE_ANON_KEY).not.toBe('');
    });

    it('should NOT have placeholder anon key', () => {
      expect(process.env.SUPABASE_ANON_KEY).not.toBe('placeholder-anon-key');
    });

    it('should have SUPABASE_SERVICE_ROLE_KEY defined', () => {
      expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
      expect(process.env.SUPABASE_SERVICE_ROLE_KEY).not.toBe('');
    });

    it('should NOT have placeholder service role key', () => {
      expect(process.env.SUPABASE_SERVICE_ROLE_KEY).not.toBe('placeholder-service-key');
    });
  });

  describe('Stripe Configuration', () => {
    it('should have STRIPE_SECRET_KEY defined', () => {
      expect(process.env.STRIPE_SECRET_KEY).toBeDefined();
      expect(process.env.STRIPE_SECRET_KEY).not.toBe('');
    });

    it('should NOT have placeholder Stripe key', () => {
      expect(process.env.STRIPE_SECRET_KEY).not.toBe('sk_test_placeholder');
    });

    it('should have valid Stripe key format', () => {
      const key = process.env.STRIPE_SECRET_KEY;
      expect(key).toMatch(/^sk_(test|live)_/);
    });
  });

  describe('Site URL Configuration', () => {
    it('should have SITE_URL defined', () => {
      expect(process.env.SITE_URL).toBeDefined();
    });

    it('should NOT have placeholder site URL', () => {
      expect(process.env.SITE_URL).not.toContain('placeholder');
    });
  });
});

describe('Runtime Config Validation', () => {
  it('should not have any placeholder values in env', () => {
    const envVars = Object.entries(process.env);
    const placeholderVars = envVars.filter(([key, value]) =>
      value?.includes('placeholder') && !key.includes('EXAMPLE')
    );

    expect(placeholderVars).toHaveLength(0);
  });
});
