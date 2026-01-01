import { describe, it, expect } from 'vitest';
import {
  validateCreateProduct,
  validateUpdateProduct,
  validateProductId,
  sanitizeProductData,
} from '@/lib/validations/product';

describe('Product Validation', () => {
  describe('validateIcon', () => {
    it('should accept single emoji', () => {
      const result = validateUpdateProduct({ icon: '📦' });
      expect(result.isValid).toBe(true);
    });

    it('should accept emoji with variation selector (e.g., 🛠️)', () => {
      const result = validateUpdateProduct({ icon: '🛠️' });
      expect(result.isValid).toBe(true);
    });

    it('should accept complex emojis (ZWJ sequences)', () => {
      const result = validateUpdateProduct({ icon: '👨‍💻' });
      expect(result.isValid).toBe(true);
    });

    it('should accept flag emojis', () => {
      const result = validateUpdateProduct({ icon: '🇵🇱' });
      expect(result.isValid).toBe(true);
    });

    it('should accept skin tone emojis', () => {
      const result = validateUpdateProduct({ icon: '👍🏽' });
      expect(result.isValid).toBe(true);
    });

    it('should accept alphanumeric icon names', () => {
      const result = validateUpdateProduct({ icon: 'rocket-icon' });
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid icon format', () => {
      const result = validateUpdateProduct({ icon: 'invalid icon!' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid icon format');
    });

    it('should reject empty icon', () => {
      const result = validateUpdateProduct({ icon: '' });
      expect(result.isValid).toBe(false);
    });

    it('should reject too long icon', () => {
      const result = validateUpdateProduct({ icon: '🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Icon must be less than 20 characters');
    });
  });

  describe('validateSlug', () => {
    it('should accept valid slug', () => {
      const result = validateUpdateProduct({ slug: 'my-product-123' });
      expect(result.isValid).toBe(true);
    });

    it('should reject slug with uppercase', () => {
      const result = validateUpdateProduct({ slug: 'My-Product' });
      expect(result.isValid).toBe(false);
    });

    it('should reject slug with spaces', () => {
      const result = validateUpdateProduct({ slug: 'my product' });
      expect(result.isValid).toBe(false);
    });

    it('should reject slug starting with hyphen', () => {
      const result = validateUpdateProduct({ slug: '-my-product' });
      expect(result.isValid).toBe(false);
    });

    it('should reject slug ending with hyphen', () => {
      const result = validateUpdateProduct({ slug: 'my-product-' });
      expect(result.isValid).toBe(false);
    });

    it('should reject slug with consecutive hyphens', () => {
      const result = validateUpdateProduct({ slug: 'my--product' });
      expect(result.isValid).toBe(false);
    });
  });

  describe('validatePrice', () => {
    it('should accept zero price (free product)', () => {
      const result = validateUpdateProduct({ price: 0 });
      expect(result.isValid).toBe(true);
    });

    it('should accept positive price', () => {
      const result = validateUpdateProduct({ price: 49.99 });
      expect(result.isValid).toBe(true);
    });

    it('should reject negative price', () => {
      const result = validateUpdateProduct({ price: -10 });
      expect(result.isValid).toBe(false);
    });

    it('should reject price over limit', () => {
      const result = validateUpdateProduct({ price: 1000000 });
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateCurrency', () => {
    it('should accept valid 3-letter uppercase currency', () => {
      const result = validateUpdateProduct({ currency: 'USD' });
      expect(result.isValid).toBe(true);
    });

    it('should accept PLN currency', () => {
      const result = validateUpdateProduct({ currency: 'PLN' });
      expect(result.isValid).toBe(true);
    });

    it('should reject lowercase currency', () => {
      const result = validateUpdateProduct({ currency: 'usd' });
      expect(result.isValid).toBe(false);
    });

    it('should reject currency with wrong length', () => {
      const result = validateUpdateProduct({ currency: 'US' });
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateDuration', () => {
    it('should accept null duration (unlimited access)', () => {
      const result = validateUpdateProduct({ auto_grant_duration_days: null });
      expect(result.isValid).toBe(true);
    });

    it('should accept valid duration', () => {
      const result = validateUpdateProduct({ auto_grant_duration_days: 30 });
      expect(result.isValid).toBe(true);
    });

    it('should reject zero duration', () => {
      const result = validateUpdateProduct({ auto_grant_duration_days: 0 });
      expect(result.isValid).toBe(false);
    });

    it('should reject duration over 10 years', () => {
      const result = validateUpdateProduct({ auto_grant_duration_days: 4000 });
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateProductId', () => {
    it('should accept valid UUID', () => {
      const result = validateProductId('550e8400-e29b-41d4-a716-446655440000');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = validateProductId('not-a-uuid');
      expect(result.isValid).toBe(false);
    });

    it('should reject empty string', () => {
      const result = validateProductId('');
      expect(result.isValid).toBe(false);
    });
  });

  describe('sanitizeProductData', () => {
    it('should remove OTO fields', () => {
      const data = {
        name: 'Test Product',
        oto_enabled: true,
        oto_product_id: '123',
        oto_discount_type: 'percentage',
        oto_discount_value: 30,
        oto_duration_minutes: 15,
      };
      const sanitized = sanitizeProductData(data);

      expect(sanitized.name).toBe('Test Product');
      expect(sanitized).not.toHaveProperty('oto_enabled');
      expect(sanitized).not.toHaveProperty('oto_product_id');
      expect(sanitized).not.toHaveProperty('oto_discount_type');
      expect(sanitized).not.toHaveProperty('oto_discount_value');
      expect(sanitized).not.toHaveProperty('oto_duration_minutes');
    });

    it('should remove dangerous fields (id, created_at, updated_at)', () => {
      const data = {
        id: '123',
        name: 'Test',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      const sanitized = sanitizeProductData(data);

      expect(sanitized).not.toHaveProperty('id');
      expect(sanitized).not.toHaveProperty('created_at');
      expect(sanitized).not.toHaveProperty('updated_at');
    });

    it('should trim string fields', () => {
      const data = {
        name: '  Test Product  ',
        description: '  A description  ',
        slug: '  test-product  ',
      };
      const sanitized = sanitizeProductData(data);

      expect(sanitized.name).toBe('Test Product');
      expect(sanitized.description).toBe('A description');
      expect(sanitized.slug).toBe('test-product');
    });

    it('should convert empty strings to null for date fields', () => {
      const data = {
        available_from: '',
        available_until: '',
        sale_price_until: '',
      };
      const sanitized = sanitizeProductData(data);

      expect(sanitized.available_from).toBeNull();
      expect(sanitized.available_until).toBeNull();
      expect(sanitized.sale_price_until).toBeNull();
    });

    it('should convert slug to lowercase', () => {
      const data = { slug: 'My-Product-Slug' };
      const sanitized = sanitizeProductData(data);

      expect(sanitized.slug).toBe('my-product-slug');
    });

    it('should convert currency to uppercase', () => {
      const data = { currency: 'pln' };
      const sanitized = sanitizeProductData(data);

      expect(sanitized.currency).toBe('PLN');
    });
  });

  describe('validateCreateProduct', () => {
    it('should validate complete product data', () => {
      const data = {
        name: 'Test Product',
        slug: 'test-product',
        description: 'A test product description',
        price: 49.99,
        currency: 'USD',
        icon: '📦',
      };
      const result = validateCreateProduct(data);
      expect(result.isValid).toBe(true);
    });

    it('should require all mandatory fields', () => {
      const result = validateCreateProduct({});
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate date range (from must be before until)', () => {
      const data = {
        name: 'Test',
        slug: 'test',
        description: 'Test',
        price: 10,
        available_from: '2025-01-15',
        available_until: '2025-01-10', // Before available_from
      };
      const result = validateCreateProduct(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Available from date must be before available until date');
    });
  });

  describe('validateUpdateProduct', () => {
    it('should allow partial updates', () => {
      const result = validateUpdateProduct({ name: 'New Name' });
      expect(result.isValid).toBe(true);
    });

    it('should validate only provided fields', () => {
      const result = validateUpdateProduct({
        price: 99.99,
        is_active: true,
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid field even in partial update', () => {
      const result = validateUpdateProduct({ price: -50 });
      expect(result.isValid).toBe(false);
    });
  });
});
