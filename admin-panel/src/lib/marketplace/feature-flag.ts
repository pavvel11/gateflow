/**
 * Marketplace Feature Flag
 *
 * Controls whether marketplace features are enabled.
 * Two independent conditions:
 * 1. MARKETPLACE_ENABLED=true — env var (deployment toggle)
 * 2. Sellf Pro license — existing ECDSA P-256 offline license keys
 *
 * @see priv/MARKETPLACE-PLAN.md — feature gating section
 * @see src/lib/license/verify.ts — license verification
 */

import { validateLicense } from '@/lib/license/verify';

// ===== SYNC: ENV-ONLY CHECK =====

/**
 * Check if marketplace is enabled via environment variable.
 * Synchronous, no I/O. Use for middleware/routing decisions.
 */
export function isMarketplaceEnabled(): boolean {
  return process.env.MARKETPLACE_ENABLED === 'true';
}

// ===== ASYNC: FULL LICENSE CHECK =====

/**
 * Check marketplace license validity.
 * Verifies ECDSA signature and domain match.
 *
 * @param currentDomain - domain to verify against (optional, skips domain check if not provided)
 * @returns true if license is valid (or demo mode bypasses license)
 */
export function checkMarketplaceLicense(currentDomain?: string): boolean {
  // Demo mode bypasses license check (but NOT env flag)
  if (process.env.DEMO_MODE === 'true') {
    return true;
  }

  const licenseKey = process.env.SELLF_LICENSE_KEY;
  if (!licenseKey) {
    return false;
  }

  const result = validateLicense(licenseKey, currentDomain);
  return result.valid;
}

// ===== HYBRID: ENV + LICENSE =====

/**
 * Full marketplace access check: env flag AND license.
 * Use for API routes and page rendering decisions.
 *
 * @param currentDomain - domain to verify against (optional)
 * @returns { enabled, licensed, accessible, reason }
 */
export function checkMarketplaceAccess(currentDomain?: string): {
  enabled: boolean;
  licensed: boolean;
  accessible: boolean;
  reason?: string;
} {
  const enabled = isMarketplaceEnabled();
  if (!enabled) {
    return {
      enabled: false,
      licensed: false,
      accessible: false,
      reason: 'Marketplace is not enabled (MARKETPLACE_ENABLED != true)',
    };
  }

  const licensed = checkMarketplaceLicense(currentDomain);
  if (!licensed) {
    return {
      enabled: true,
      licensed: false,
      accessible: false,
      reason: 'Valid Sellf Pro license required for marketplace features',
    };
  }

  return {
    enabled: true,
    licensed: true,
    accessible: true,
  };
}
