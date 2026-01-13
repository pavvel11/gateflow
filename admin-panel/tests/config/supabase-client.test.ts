/**
 * Supabase Client Configuration Tests
 * Verifies that Supabase clients are properly configured with runtime values
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the Supabase client creation to capture the URL being used
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url: string, key: string) => {
    // Return a mock that stores the URL for testing
    return {
      _url: url,
      _key: key,
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })),
    };
  }),
}));

describe('Supabase Admin Client', () => {
  it('should use SUPABASE_URL not NEXT_PUBLIC_SUPABASE_URL', async () => {
    // Set up test env
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    process.env.SUPABASE_URL = 'https://test-runtime.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

    // Clear module cache to get fresh import
    vi.resetModules();

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const client = createAdminClient();

    expect((client as any)._url).toBe('https://test-runtime.supabase.co');
    expect((client as any)._url).not.toContain('placeholder');

    // Restore
    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it('should throw if SUPABASE_URL is not defined', async () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    vi.resetModules();

    const { createAdminClient } = await import('@/lib/supabase/admin');

    expect(() => createAdminClient()).toThrow('SUPABASE_URL is not defined');

    // Restore
    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it('should throw if SUPABASE_SERVICE_ROLE_KEY is not defined', async () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    process.env.SUPABASE_URL = 'https://test.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    vi.resetModules();

    const { createAdminClient } = await import('@/lib/supabase/admin');

    expect(() => createAdminClient()).toThrow('SUPABASE_SERVICE_ROLE_KEY is not defined');

    // Restore
    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });
});

describe('No Placeholder Values in Clients', () => {
  it('should not create client with placeholder URL', async () => {
    const { createClient } = await import('@supabase/supabase-js');

    // This should fail if anyone tries to use placeholder
    const mockCreateClient = createClient as any;

    // Verify that no calls were made with placeholder URLs
    const calls = mockCreateClient.mock?.calls || [];
    const placeholderCalls = calls.filter((call: any[]) =>
      call[0]?.includes('placeholder')
    );

    expect(placeholderCalls).toHaveLength(0);
  });
});
