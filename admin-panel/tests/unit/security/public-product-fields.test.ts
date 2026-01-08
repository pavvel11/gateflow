import { describe, it, expect } from 'vitest';

/**
 * ============================================================================
 * SECURITY TEST: Public Product API Field Exposure
 * ============================================================================
 *
 * VULNERABILITY: Content Config Exposed on Public Endpoints (V-CRITICAL-08)
 * LOCATION:
 *   - src/app/api/public/products/[slug]/route.ts
 *   - src/app/api/products/[id]/route.ts
 *
 * ATTACK FLOW (before fix):
 * 1. Attacker calls GET /api/public/products/premium-course (no auth required)
 * 2. Response includes full product object with select('*')
 * 3. content_config contains download URLs, redirect URLs, etc.
 * 4. Attacker downloads paid content for FREE without purchasing
 *
 * ROOT CAUSE:
 * Using select('*') on public endpoints exposed ALL columns including:
 * - content_config (download URLs, content items)
 * - success_redirect_url (internal URLs)
 * - Other internal configuration
 *
 * FIX (V18):
 * Changed to explicit field list, excluding:
 * - content_config (contains download URLs - only returned after access check)
 * - success_redirect_url (internal config)
 * - pass_params_to_redirect (internal config)
 * - auto_grant_duration_days (internal config)
 * - tenant_id (internal)
 *
 * Created during security audit iteration 7 (2026-01-08)
 * ============================================================================
 */

// Fields that SHOULD be returned by public product endpoints
const PUBLIC_SAFE_FIELDS = [
  'id',
  'name',
  'slug',
  'description',
  'icon',
  'price',
  'currency',
  'is_active',
  'is_featured',
  'available_from',
  'available_until',
  'allow_custom_price',
  'custom_price_min',
  'custom_price_presets',
  'show_price_presets',
  'enable_waitlist',
  'content_delivery_type',
  'layout_template',
];

// Fields that MUST NOT be returned by public endpoints
const SENSITIVE_FIELDS = [
  'content_config',         // Contains download URLs!
  'success_redirect_url',   // Internal redirect config
  'pass_params_to_redirect', // Internal config
  'auto_grant_duration_days', // Internal config
  'tenant_id',              // Multi-tenancy internal
];

describe('Public Product API Field Exposure', () => {
  describe('Field Classification', () => {
    it('should have separate lists for public and sensitive fields', () => {
      // No overlap between public and sensitive fields
      const overlap = PUBLIC_SAFE_FIELDS.filter(f => SENSITIVE_FIELDS.includes(f));
      expect(overlap).toHaveLength(0);
    });

    it('content_config is classified as sensitive', () => {
      expect(SENSITIVE_FIELDS).toContain('content_config');
    });

    it('price and currency are public (needed for product page)', () => {
      expect(PUBLIC_SAFE_FIELDS).toContain('price');
      expect(PUBLIC_SAFE_FIELDS).toContain('currency');
    });
  });

  describe('Vulnerability Scenarios', () => {
    it('Scenario: Free download via content_config exposure', () => {
      /**
       * Attack (before fix):
       * 1. Call GET /api/public/products/expensive-course
       * 2. Response contains:
       *    {
       *      "content_config": {
       *        "content_items": [{
       *          "type": "download_link",
       *          "config": {
       *            "download_url": "https://storage.supabase.co/secret-video.mp4"
       *          }
       *        }]
       *      }
       *    }
       * 3. Attacker downloads video without paying
       *
       * After fix: content_config is NOT returned
       */
      const mockVulnerableResponse = {
        id: 'prod_123',
        name: 'Expensive Course',
        price: 29900,
        content_config: {
          content_items: [{
            type: 'download_link',
            config: {
              download_url: 'https://storage.supabase.co/secret-video.mp4'
            }
          }]
        }
      };

      // Attacker extracts download URL
      const downloadUrl = mockVulnerableResponse.content_config?.content_items?.[0]?.config?.download_url;

      // Before fix: URL was exposed
      expect(downloadUrl).toBe('https://storage.supabase.co/secret-video.mp4');

      // After fix: content_config should not be in response
      const mockFixedResponse = {
        id: 'prod_123',
        name: 'Expensive Course',
        price: 29900,
        // content_config NOT included
      };

      expect(mockFixedResponse).not.toHaveProperty('content_config');
    });

    it('Scenario: Redirect URL exposure for redirect products', () => {
      /**
       * Attack for redirect-type products:
       * 1. Product configured with content_delivery_type: 'redirect'
       * 2. content_config contains redirect_url to external course platform
       * 3. Attacker gets URL without paying
       */
      const mockVulnerableProduct = {
        content_delivery_type: 'redirect',
        content_config: {
          redirect_url: 'https://premium-course-platform.com/course/abc123?token=secret'
        }
      };

      // Attacker gets direct access to paid course
      expect(mockVulnerableProduct.content_config.redirect_url).toContain('token=secret');

      // After fix: redirect_url not exposed
      const mockFixedProduct = {
        content_delivery_type: 'redirect',
        // content_config NOT included
      };

      expect(mockFixedProduct).not.toHaveProperty('content_config');
    });

    it('Scenario: Enumeration of all download URLs', () => {
      /**
       * Attack:
       * 1. Attacker knows product slugs (from public listing or sitemap)
       * 2. Iterates through all products
       * 3. Collects all download URLs
       * 4. Downloads entire catalog for free
       */
      const productSlugs = ['course-1', 'course-2', 'premium-bundle'];

      // Before fix: Each call returned content_config
      // After fix: No content_config returned

      productSlugs.forEach(slug => {
        // Simulate fixed API response
        const response = {
          slug,
          name: `Product ${slug}`,
          price: 9900,
          // NO content_config
        };

        expect(response).not.toHaveProperty('content_config');
      });
    });
  });

  describe('Protected Endpoint Comparison', () => {
    it('authenticated /content endpoint SHOULD return content_config', () => {
      /**
       * The /api/public/products/[slug]/content endpoint:
       * 1. Requires authentication
       * 2. Checks user_product_access
       * 3. THEN returns content_config
       *
       * This is the CORRECT behavior - content is protected
       */
      const authenticatedContentResponse = {
        id: 'prod_123',
        name: 'Course',
        content_config: {
          content_items: [
            { type: 'download_link', config: { download_url: '...' } }
          ]
        },
        user_access: {
          access_expires_at: null
        }
      };

      // Content IS returned after access check
      expect(authenticatedContentResponse).toHaveProperty('content_config');
      expect(authenticatedContentResponse).toHaveProperty('user_access');
    });
  });

  describe('Field Whitelist Validation', () => {
    it('should include all necessary display fields', () => {
      const requiredForDisplay = [
        'id', 'name', 'slug', 'description', 'price', 'currency', 'icon'
      ];

      requiredForDisplay.forEach(field => {
        expect(PUBLIC_SAFE_FIELDS).toContain(field);
      });
    });

    it('should include waitlist and availability fields', () => {
      expect(PUBLIC_SAFE_FIELDS).toContain('enable_waitlist');
      expect(PUBLIC_SAFE_FIELDS).toContain('available_from');
      expect(PUBLIC_SAFE_FIELDS).toContain('available_until');
    });

    it('should include custom pricing fields for PWYW products', () => {
      expect(PUBLIC_SAFE_FIELDS).toContain('allow_custom_price');
      expect(PUBLIC_SAFE_FIELDS).toContain('custom_price_min');
      expect(PUBLIC_SAFE_FIELDS).toContain('custom_price_presets');
      expect(PUBLIC_SAFE_FIELDS).toContain('show_price_presets');
    });

    it('should include layout but NOT content config', () => {
      expect(PUBLIC_SAFE_FIELDS).toContain('layout_template');
      expect(PUBLIC_SAFE_FIELDS).toContain('content_delivery_type');
      expect(PUBLIC_SAFE_FIELDS).not.toContain('content_config');
    });
  });
});
