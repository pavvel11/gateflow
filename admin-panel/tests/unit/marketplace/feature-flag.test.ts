/**
 * Unit Tests: Marketplace Feature Flag
 *
 * Tests isMarketplaceEnabled, checkMarketplaceLicense, checkMarketplaceAccess.
 *
 * Run: bunx vitest run tests/unit/marketplace/feature-flag.test.ts
 *
 * @see src/lib/marketplace/feature-flag.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isMarketplaceEnabled,
  checkMarketplaceLicense,
  checkMarketplaceAccess,
} from '@/lib/marketplace/feature-flag';

describe('isMarketplaceEnabled()', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return true when MARKETPLACE_ENABLED=true', () => {
    process.env.MARKETPLACE_ENABLED = 'true';
    expect(isMarketplaceEnabled()).toBe(true);
  });

  it('should return false when MARKETPLACE_ENABLED is not set', () => {
    delete process.env.MARKETPLACE_ENABLED;
    expect(isMarketplaceEnabled()).toBe(false);
  });

  it('should return false when MARKETPLACE_ENABLED=false', () => {
    process.env.MARKETPLACE_ENABLED = 'false';
    expect(isMarketplaceEnabled()).toBe(false);
  });

  it('should return false when MARKETPLACE_ENABLED is empty', () => {
    process.env.MARKETPLACE_ENABLED = '';
    expect(isMarketplaceEnabled()).toBe(false);
  });

  it('should return false when MARKETPLACE_ENABLED=TRUE (case sensitive)', () => {
    process.env.MARKETPLACE_ENABLED = 'TRUE';
    expect(isMarketplaceEnabled()).toBe(false);
  });
});

describe('checkMarketplaceLicense()', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return true in demo mode', () => {
    process.env.DEMO_MODE = 'true';
    delete process.env.SELLF_LICENSE_KEY;
    expect(checkMarketplaceLicense()).toBe(true);
  });

  it('should return false when no license key', () => {
    delete process.env.DEMO_MODE;
    delete process.env.SELLF_LICENSE_KEY;
    expect(checkMarketplaceLicense()).toBe(false);
  });

  it('should return false for invalid license key', () => {
    delete process.env.DEMO_MODE;
    process.env.SELLF_LICENSE_KEY = 'INVALID-KEY';
    expect(checkMarketplaceLicense()).toBe(false);
  });

  it('should return false for malformed license format', () => {
    delete process.env.DEMO_MODE;
    process.env.SELLF_LICENSE_KEY = 'SF-invalid';
    expect(checkMarketplaceLicense()).toBe(false);
  });
});

describe('checkMarketplaceAccess()', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return not accessible when MARKETPLACE_ENABLED is not set', () => {
    delete process.env.MARKETPLACE_ENABLED;
    const result = checkMarketplaceAccess();
    expect(result.accessible).toBe(false);
    expect(result.enabled).toBe(false);
    expect(result.reason).toContain('not enabled');
  });

  it('should return not accessible when enabled but no license', () => {
    process.env.MARKETPLACE_ENABLED = 'true';
    delete process.env.DEMO_MODE;
    delete process.env.SELLF_LICENSE_KEY;
    const result = checkMarketplaceAccess();
    expect(result.accessible).toBe(false);
    expect(result.enabled).toBe(true);
    expect(result.licensed).toBe(false);
    expect(result.reason).toContain('license');
  });

  it('should return accessible when enabled + demo mode', () => {
    process.env.MARKETPLACE_ENABLED = 'true';
    process.env.DEMO_MODE = 'true';
    const result = checkMarketplaceAccess();
    expect(result.accessible).toBe(true);
    expect(result.enabled).toBe(true);
    expect(result.licensed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should return not accessible when demo mode but MARKETPLACE_ENABLED not set', () => {
    // Demo mode bypasses license, NOT env flag
    delete process.env.MARKETPLACE_ENABLED;
    process.env.DEMO_MODE = 'true';
    const result = checkMarketplaceAccess();
    expect(result.accessible).toBe(false);
    expect(result.enabled).toBe(false);
  });
});
