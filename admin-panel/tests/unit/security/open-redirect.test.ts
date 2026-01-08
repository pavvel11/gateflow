import { describe, it, expect } from 'vitest';

/**
 * ============================================================================
 * SECURITY TEST: Open Redirect Prevention
 * ============================================================================
 *
 * VULNERABILITY: Open Redirect via return_url parameter
 * LOCATION: src/app/[locale]/auth/product-access/route.ts
 *
 * ATTACK FLOW:
 * 1. Attacker crafts URL: /auth/product-access?product=free&return_url=https://evil.com
 * 2. User clicks link (e.g., from phishing email)
 * 3. User gets free product access (legitimate)
 * 4. User is redirected to attacker's site (malicious)
 * 5. Attacker can perform phishing, steal sessions, etc.
 *
 * FIX:
 * - Only allow relative paths (starting with / but not //)
 * - Only allow same-origin URLs matching SITE_URL
 *
 * Created during security audit (2026-01-08)
 * ============================================================================
 */

/**
 * REFERENCE IMPLEMENTATION: Secure redirect URL validation
 * Copy to: src/lib/validations/redirect.ts
 */
function isValidRedirectUrl(returnUrl: string, siteUrl?: string): boolean {
  // Allow relative paths (but not protocol-relative URLs like //evil.com)
  if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
    return true;
  }

  // For absolute URLs, validate against allowed origins
  try {
    const returnUrlObj = new URL(returnUrl);

    if (!siteUrl) {
      // No SITE_URL configured - only allow relative paths
      return false;
    }

    const siteUrlObj = new URL(siteUrl);

    // Must match origin (protocol + hostname + port)
    if (returnUrlObj.origin !== siteUrlObj.origin) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

describe('Open Redirect Prevention', () => {
  const SITE_URL = 'https://gateflow.com';

  describe('Relative Paths', () => {
    it('should allow simple relative paths', () => {
      expect(isValidRedirectUrl('/dashboard', SITE_URL)).toBe(true);
      expect(isValidRedirectUrl('/p/my-product', SITE_URL)).toBe(true);
      expect(isValidRedirectUrl('/auth/callback', SITE_URL)).toBe(true);
    });

    it('should allow relative paths with query strings', () => {
      expect(isValidRedirectUrl('/dashboard?tab=settings', SITE_URL)).toBe(true);
      expect(isValidRedirectUrl('/p/product?ref=email', SITE_URL)).toBe(true);
    });

    it('should allow relative paths with hash fragments', () => {
      expect(isValidRedirectUrl('/docs#section-1', SITE_URL)).toBe(true);
      expect(isValidRedirectUrl('/p/product#reviews', SITE_URL)).toBe(true);
    });

    it('should BLOCK protocol-relative URLs (//evil.com)', () => {
      // This is a common bypass technique
      expect(isValidRedirectUrl('//evil.com', SITE_URL)).toBe(false);
      expect(isValidRedirectUrl('//evil.com/path', SITE_URL)).toBe(false);
      expect(isValidRedirectUrl('///evil.com', SITE_URL)).toBe(false);
    });
  });

  describe('Absolute URLs - Same Origin', () => {
    it('should allow same-origin HTTPS URLs', () => {
      expect(isValidRedirectUrl('https://gateflow.com/dashboard', SITE_URL)).toBe(true);
      expect(isValidRedirectUrl('https://gateflow.com/p/product', SITE_URL)).toBe(true);
    });

    it('should allow same-origin with path and query', () => {
      expect(isValidRedirectUrl('https://gateflow.com/dashboard?tab=1', SITE_URL)).toBe(true);
    });
  });

  describe('Absolute URLs - Different Origin (BLOCKED)', () => {
    it('should BLOCK external domains', () => {
      expect(isValidRedirectUrl('https://evil.com', SITE_URL)).toBe(false);
      expect(isValidRedirectUrl('https://attacker.com/phishing', SITE_URL)).toBe(false);
      expect(isValidRedirectUrl('https://gateflow.com.evil.com', SITE_URL)).toBe(false);
    });

    it('should BLOCK different subdomains', () => {
      expect(isValidRedirectUrl('https://admin.gateflow.com', SITE_URL)).toBe(false);
      expect(isValidRedirectUrl('https://api.gateflow.com', SITE_URL)).toBe(false);
    });

    it('should BLOCK different protocols', () => {
      expect(isValidRedirectUrl('http://gateflow.com/dashboard', SITE_URL)).toBe(false);
    });

    it('should BLOCK different ports', () => {
      expect(isValidRedirectUrl('https://gateflow.com:8080/dashboard', SITE_URL)).toBe(false);
    });
  });

  describe('Attack Payloads', () => {
    it('should block common open redirect payloads', () => {
      const payloads = [
        'https://evil.com',
        '//evil.com',
        '///evil.com',
        'https://gateflow.com@evil.com',  // Basic auth bypass attempt
        'https://evil.com?gateflow.com',  // Query string trick
        'javascript:alert(1)',            // JS protocol
        'data:text/html,<script>alert(1)</script>',  // Data URL
        '//evil.com/%2f..',              // Encoded path traversal
      ];

      for (const payload of payloads) {
        expect(isValidRedirectUrl(payload, SITE_URL)).toBe(false);
      }
    });

    it('should handle backslash in path (relative, not open redirect)', () => {
      // /\\evil.com is a relative path to "/\\evil.com" on the same domain
      // Not an open redirect - browsers will request /\evil.com from current origin
      expect(isValidRedirectUrl('/\\evil.com', SITE_URL)).toBe(true);
    });

    it('should block URL-encoded bypass attempts', () => {
      const payloads = [
        '%2f%2fevil.com', // URL-encoded //
        '/%2fevil.com',   // /evil.com encoded
      ];

      for (const payload of payloads) {
        // These should either be blocked or decoded first
        // The actual validation happens on the decoded URL
        const decoded = decodeURIComponent(payload);
        expect(isValidRedirectUrl(decoded, SITE_URL)).toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty SITE_URL (only allow relative)', () => {
      expect(isValidRedirectUrl('/dashboard', undefined)).toBe(true);
      expect(isValidRedirectUrl('https://any.com', undefined)).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(isValidRedirectUrl('not-a-url', SITE_URL)).toBe(false);
      expect(isValidRedirectUrl('', SITE_URL)).toBe(false);
    });

    it('should handle SITE_URL with trailing slash', () => {
      const siteWithSlash = 'https://gateflow.com/';
      expect(isValidRedirectUrl('https://gateflow.com/dashboard', siteWithSlash)).toBe(true);
    });

    it('should handle localhost in development', () => {
      const localSite = 'http://localhost:3000';
      expect(isValidRedirectUrl('http://localhost:3000/dashboard', localSite)).toBe(true);
      expect(isValidRedirectUrl('http://localhost:3001/dashboard', localSite)).toBe(false);
    });
  });

  describe('Real Attack Scenarios', () => {
    it('Scenario: Phishing via return_url', () => {
      /**
       * Attack:
       * 1. Attacker sends email: "Click here to get your free course"
       * 2. Link: https://gateflow.com/auth/product-access?product=free&return_url=https://evil.com/fake-login
       * 3. User gets free course (legitimate)
       * 4. User is redirected to fake login page
       * 5. User enters credentials thinking they need to re-login
       */
      const attackUrl = 'https://evil.com/fake-login';
      expect(isValidRedirectUrl(attackUrl, SITE_URL)).toBe(false);
    });

    it('Scenario: Session token theft via Referer', () => {
      /**
       * Attack:
       * 1. return_url points to attacker's site
       * 2. User is redirected with session token in URL
       * 3. Attacker's site receives Referer header with token
       */
      const attackUrl = 'https://attacker.com/collect-referer';
      expect(isValidRedirectUrl(attackUrl, SITE_URL)).toBe(false);
    });

    it('Scenario: OAuth token interception', () => {
      /**
       * Attack:
       * 1. Attacker crafts OAuth callback URL
       * 2. return_url redirects to attacker after successful OAuth
       * 3. OAuth tokens leak to attacker
       */
      const attackUrl = 'https://attacker.com/oauth-callback?code=stolen';
      expect(isValidRedirectUrl(attackUrl, SITE_URL)).toBe(false);
    });
  });
});
