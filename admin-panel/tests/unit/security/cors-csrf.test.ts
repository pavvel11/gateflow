import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateCrossOriginRequest,
  getCrossOriginHeaders,
  getRestrictiveHeaders,
  createCrossOriginOptionsResponse,
  CROSS_ORIGIN_ALLOWED_PATHS
} from '@/lib/cors';

/**
 * Security Tests: CORS/CSRF Protection
 *
 * These tests verify that cross-origin request handling is secure
 * and prevents CSRF attacks.
 */
describe('CORS/CSRF Security', () => {
  // Helper to create mock Request
  function createMockRequest(options: {
    origin?: string | null;
    xRequestedWith?: string | null;
    method?: string;
  } = {}): Request {
    const headers = new Headers();
    if (options.origin !== undefined) {
      if (options.origin !== null) {
        headers.set('origin', options.origin);
      }
    }
    if (options.xRequestedWith !== undefined) {
      if (options.xRequestedWith !== null) {
        headers.set('X-Requested-With', options.xRequestedWith);
      }
    }
    return {
      headers,
      method: options.method || 'POST',
    } as Request;
  }

  describe('CROSS_ORIGIN_ALLOWED_PATHS', () => {
    it('should only contain read-only endpoints', () => {
      // These paths should ONLY be endpoints that:
      // 1. Do not modify data (read-only)
      // 2. Return non-sensitive information
      expect(CROSS_ORIGIN_ALLOWED_PATHS).toContain('/api/access');
      expect(CROSS_ORIGIN_ALLOWED_PATHS).toContain('/api/gatekeeper');

      // Should NOT contain admin endpoints
      expect(CROSS_ORIGIN_ALLOWED_PATHS).not.toContain('/api/admin/products');
      expect(CROSS_ORIGIN_ALLOWED_PATHS).not.toContain('/api/users');
      expect(CROSS_ORIGIN_ALLOWED_PATHS).not.toContain('/api/webhooks');
    });

    it('should have a limited number of allowed paths', () => {
      // Principle of least privilege - minimize cross-origin access
      expect(CROSS_ORIGIN_ALLOWED_PATHS.length).toBeLessThanOrEqual(5);
    });
  });

  describe('validateCrossOriginRequest', () => {
    it('should reject requests without X-Requested-With header', () => {
      const request = createMockRequest({
        origin: 'https://evil.com',
        xRequestedWith: null,
      });

      const result = validateCrossOriginRequest(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    });

    it('should reject requests with wrong X-Requested-With value', () => {
      const request = createMockRequest({
        origin: 'https://evil.com',
        xRequestedWith: 'fetch', // Not XMLHttpRequest
      });

      const result = validateCrossOriginRequest(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    });

    it('should accept requests with valid X-Requested-With header', () => {
      const request = createMockRequest({
        origin: 'https://trusted.com',
        xRequestedWith: 'XMLHttpRequest',
      });

      const result = validateCrossOriginRequest(request);

      expect(result).toBeNull(); // null means valid
    });

    // CSRF Attack scenarios
    describe('CSRF Attack Prevention', () => {
      it('should block simple form POST (no X-Requested-With)', () => {
        // Simulates: <form action="/api/access" method="POST">
        const request = createMockRequest({
          origin: 'https://attacker.com',
          xRequestedWith: null,
        });

        const result = validateCrossOriginRequest(request);
        expect(result?.status).toBe(403);
      });

      it('should block image/script tag attacks (no custom headers)', () => {
        // Simulates: <img src="/api/access?..."> or <script src="/api/access">
        // These cannot set custom headers
        const request = createMockRequest({
          origin: null, // No origin for some simple requests
          xRequestedWith: null,
        });

        const result = validateCrossOriginRequest(request);
        expect(result?.status).toBe(403);
      });

      it('should block fetch without custom headers', () => {
        // Simulates: fetch('/api/access', { method: 'POST', credentials: 'include' })
        // Without explicitly setting X-Requested-With
        const request = createMockRequest({
          origin: 'https://attacker.com',
          xRequestedWith: null,
        });

        const result = validateCrossOriginRequest(request);
        expect(result?.status).toBe(403);
      });

      it('should allow legitimate AJAX requests', () => {
        // Simulates: $.ajax() or fetch with X-Requested-With
        const request = createMockRequest({
          origin: 'https://my-app.com',
          xRequestedWith: 'XMLHttpRequest',
        });

        const result = validateCrossOriginRequest(request);
        expect(result).toBeNull();
      });
    });
  });

  describe('getCrossOriginHeaders', () => {
    it('should reflect the origin header', () => {
      const request = createMockRequest({
        origin: 'https://my-app.com',
      });

      const headers = getCrossOriginHeaders(request);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://my-app.com');
    });

    it('should include credentials header', () => {
      const request = createMockRequest({
        origin: 'https://my-app.com',
      });

      const headers = getCrossOriginHeaders(request);

      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('should require X-Requested-With in allowed headers', () => {
      const request = createMockRequest({
        origin: 'https://my-app.com',
      });

      const headers = getCrossOriginHeaders(request);

      expect(headers['Access-Control-Allow-Headers']).toContain('X-Requested-With');
    });

    // Security concern: wildcard fallback
    describe('Wildcard Origin Handling', () => {
      it('should fall back to * when no origin provided', () => {
        // This is a potential security concern - documents it
        const request = createMockRequest({
          origin: null,
        });

        const headers = getCrossOriginHeaders(request);

        // Note: This combination (* with credentials) is actually
        // blocked by browsers, so this is safe in practice
        expect(headers['Access-Control-Allow-Origin']).toBe('*');
      });

      it('should not expose sensitive data via wildcard', () => {
        // Verify that endpoints using getCrossOriginHeaders
        // are read-only and non-sensitive
        // This is a documentation/awareness test
        const nonSensitiveEndpoints = ['/api/access', '/api/gatekeeper'];

        for (const endpoint of CROSS_ORIGIN_ALLOWED_PATHS) {
          expect(nonSensitiveEndpoints).toContain(endpoint);
        }
      });
    });
  });

  describe('getRestrictiveHeaders', () => {
    it('should NOT include credentials header', () => {
      const headers = getRestrictiveHeaders();

      // Critical: no credentials should be allowed for admin endpoints
      expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
    });

    it('should use wildcard origin (safe without credentials)', () => {
      const headers = getRestrictiveHeaders();

      // Wildcard is safe when credentials are not allowed
      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should allow necessary methods', () => {
      const headers = getRestrictiveHeaders();

      expect(headers['Access-Control-Allow-Methods']).toContain('GET');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
      expect(headers['Access-Control-Allow-Methods']).toContain('PUT');
      expect(headers['Access-Control-Allow-Methods']).toContain('DELETE');
    });
  });

  describe('createCrossOriginOptionsResponse', () => {
    it('should return 200 status', () => {
      const request = createMockRequest({
        origin: 'https://my-app.com',
      });

      const response = createCrossOriginOptionsResponse(request);

      expect(response.status).toBe(200);
    });

    it('should include CORS headers', () => {
      const request = createMockRequest({
        origin: 'https://my-app.com',
      });

      const response = createCrossOriginOptionsResponse(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://my-app.com');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });
  });

  describe('Integration: End-to-End CORS/CSRF Scenarios', () => {
    it('should protect against reflected origin CORS vulnerability', () => {
      // Attack: Attacker sets origin to arbitrary domain, hoping it's reflected
      const maliciousOrigins = [
        'https://evil.com',
        'https://attacker.example.com',
        'null', // Some browsers send this
        '', // Empty string
      ];

      for (const origin of maliciousOrigins) {
        const request = createMockRequest({
          origin: origin || null,
          xRequestedWith: null, // No custom header
        });

        // The X-Requested-With check should block this
        const result = validateCrossOriginRequest(request);
        expect(result?.status).toBe(403);
      }
    });

    it('should handle preflight + actual request flow', () => {
      const origin = 'https://legitimate-app.com';

      // 1. Preflight (OPTIONS)
      const preflightRequest = createMockRequest({
        origin,
        method: 'OPTIONS',
      });
      const preflightResponse = createCrossOriginOptionsResponse(preflightRequest);
      expect(preflightResponse.status).toBe(200);
      expect(preflightResponse.headers.get('Access-Control-Allow-Origin')).toBe(origin);

      // 2. Actual request (POST)
      const actualRequest = createMockRequest({
        origin,
        xRequestedWith: 'XMLHttpRequest',
        method: 'POST',
      });
      const validationResult = validateCrossOriginRequest(actualRequest);
      expect(validationResult).toBeNull(); // Should pass
    });

    it('should distinguish between admin and public endpoints', () => {
      // Public endpoints (cross-origin allowed)
      expect(CROSS_ORIGIN_ALLOWED_PATHS).toContain('/api/access');

      // Admin endpoints should NOT be in the allowed list
      const adminEndpoints = [
        '/api/admin',
        '/api/users',
        '/api/webhooks',
        '/api/stripe',
      ];

      for (const endpoint of adminEndpoints) {
        expect(CROSS_ORIGIN_ALLOWED_PATHS).not.toContain(endpoint);
      }
    });
  });

  describe('Security Headers Completeness', () => {
    it('getCrossOriginHeaders should include all necessary CORS headers', () => {
      const request = createMockRequest({ origin: 'https://app.com' });
      const headers = getCrossOriginHeaders(request);

      const requiredHeaders = [
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Credentials',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Headers',
      ];

      for (const header of requiredHeaders) {
        expect(headers[header]).toBeDefined();
      }
    });

    it('should include caching header for preflight', () => {
      const request = createMockRequest({ origin: 'https://app.com' });
      const headers = getCrossOriginHeaders(request);

      // Access-Control-Max-Age allows caching of preflight response
      expect(headers['Access-Control-Max-Age']).toBeDefined();
    });
  });
});
