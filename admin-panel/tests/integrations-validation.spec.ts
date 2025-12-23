import { test, expect } from '@playwright/test';
import { validateIntegrations } from '../src/lib/validations/integrations';

test.describe('Integrations Validation Logic', () => {
  
  test('should accept valid GTM ID', () => {
    const result = validateIntegrations({
      gtm_container_id: 'GTM-ABC123'
    });
    expect(result.isValid).toBe(true);
  });

  test('should reject invalid GTM ID', () => {
    const result = validateIntegrations({
      gtm_container_id: 'INVALID-ID'
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.gtm_container_id).toContain('Invalid GTM Container ID format');
  });

  test('should accept valid FB Pixel ID', () => {
    const result = validateIntegrations({
      facebook_pixel_id: '1234567890'
    });
    expect(result.isValid).toBe(true);
  });

  test('should reject non-numeric FB Pixel ID', () => {
    const result = validateIntegrations({
      facebook_pixel_id: 'ABC123'
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.facebook_pixel_id).toContain('Facebook Pixel ID must be numeric');
  });
});
