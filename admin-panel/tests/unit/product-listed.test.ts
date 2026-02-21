import { describe, it, expect } from 'vitest';
import { sanitizeProductData } from '@/lib/validations/product';
import { initialFormData } from '@/components/ProductFormModal/types';

describe('Product is_listed flag', () => {
  describe('initialFormData', () => {
    it('should default is_listed to true', () => {
      expect(initialFormData.is_listed).toBe(true);
    });

    it('should have is_listed alongside is_active and is_featured', () => {
      expect(initialFormData).toHaveProperty('is_active', true);
      expect(initialFormData).toHaveProperty('is_featured', false);
      expect(initialFormData).toHaveProperty('is_listed', true);
    });
  });

  describe('sanitizeProductData', () => {
    it('should pass through is_listed=true', () => {
      const data = { name: 'Test', is_listed: true };
      const result = sanitizeProductData(data);
      expect(result.is_listed).toBe(true);
    });

    it('should pass through is_listed=false', () => {
      const data = { name: 'Test', is_listed: false };
      const result = sanitizeProductData(data);
      expect(result.is_listed).toBe(false);
    });

    it('should not strip is_listed during sanitization', () => {
      const data = {
        name: 'Test Product',
        slug: 'test-product',
        price: 10,
        is_active: true,
        is_listed: false,
        is_featured: false,
      };
      const result = sanitizeProductData(data);
      expect(result.is_listed).toBe(false);
      expect(result.is_active).toBe(true);
    });

    it('should not add is_listed when not provided (partial update)', () => {
      const data = { name: 'Updated Name' };
      const result = sanitizeProductData(data, false);
      expect(result).not.toHaveProperty('is_listed');
    });
  });
});
