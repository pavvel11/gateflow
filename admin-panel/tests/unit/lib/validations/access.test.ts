/**
 * Access Validation Unit Tests
 *
 * Tests for user access validation, sanitization, and input checks.
 */

import { describe, it, expect } from 'vitest';
import {
  validateGrantAccess,
  validateUserAction,
  validateAccessCheck,
  sanitizeGrantAccessData,
  sanitizeUserActionData,
  sanitizeAccessCheckData,
} from '@/lib/validations/access';

describe('Access Validation', () => {
  describe('validateGrantAccess', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';

    it('should validate valid grant access data', () => {
      const result = validateGrantAccess({ product_id: validUUID });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate with optional duration', () => {
      const result = validateGrantAccess({
        product_id: validUUID,
        access_duration_days: 30,
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid product_id format', () => {
      const result = validateGrantAccess({ product_id: 'invalid-uuid' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid UUID format');
    });

    it('should reject missing product_id', () => {
      const result = validateGrantAccess({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('UUID is required');
    });

    it('should reject non-string product_id', () => {
      const result = validateGrantAccess({ product_id: 123 });
      expect(result.isValid).toBe(false);
    });

    it('should validate duration when provided', () => {
      const result = validateGrantAccess({
        product_id: validUUID,
        access_duration_days: 0,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duration must be at least 1 day');
    });

    it('should reject duration exceeding 10 years', () => {
      const result = validateGrantAccess({
        product_id: validUUID,
        access_duration_days: 4000,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duration cannot exceed 10 years');
    });

    it('should reject non-integer duration', () => {
      const result = validateGrantAccess({
        product_id: validUUID,
        access_duration_days: 30.5,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duration must be an integer');
    });

    it('should validate expiration date format', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const result = validateGrantAccess({
        product_id: validUUID,
        access_expires_at: futureDate.toISOString(),
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject past expiration date', () => {
      const result = validateGrantAccess({
        product_id: validUUID,
        access_expires_at: '2020-01-01T00:00:00Z',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date must be in the future');
    });

    it('should reject date more than 10 years in future', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 15);

      const result = validateGrantAccess({
        product_id: validUUID,
        access_expires_at: farFuture.toISOString(),
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date cannot be more than 10 years in the future');
    });

    it('should allow empty string for expires_at', () => {
      const result = validateGrantAccess({
        product_id: validUUID,
        access_expires_at: '',
      });
      expect(result.isValid).toBe(true);
    });

    it('should allow null for optional fields', () => {
      const result = validateGrantAccess({
        product_id: validUUID,
        access_duration_days: null,
        access_expires_at: null,
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateUserAction', () => {
    const validUUID1 = '123e4567-e89b-12d3-a456-426614174000';
    const validUUID2 = '223e4567-e89b-12d3-a456-426614174001';

    it('should validate valid grant action', () => {
      const result = validateUserAction({
        userId: validUUID1,
        productId: validUUID2,
        action: 'grant',
      });
      expect(result.isValid).toBe(true);
    });

    it('should validate valid revoke action', () => {
      const result = validateUserAction({
        userId: validUUID1,
        productId: validUUID2,
        action: 'revoke',
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid action', () => {
      const result = validateUserAction({
        userId: validUUID1,
        productId: validUUID2,
        action: 'delete',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action must be either "grant" or "revoke"');
    });

    it('should reject missing userId', () => {
      const result = validateUserAction({
        productId: validUUID2,
        action: 'grant',
      });
      expect(result.isValid).toBe(false);
    });

    it('should reject invalid userId format', () => {
      const result = validateUserAction({
        userId: 'not-a-uuid',
        productId: validUUID2,
        action: 'grant',
      });
      expect(result.isValid).toBe(false);
    });

    it('should reject missing action', () => {
      const result = validateUserAction({
        userId: validUUID1,
        productId: validUUID2,
      });
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateAccessCheck', () => {
    it('should validate single productSlug', () => {
      const result = validateAccessCheck({ productSlug: 'my-product' });
      expect(result.isValid).toBe(true);
    });

    it('should validate productSlugs array', () => {
      const result = validateAccessCheck({
        productSlugs: ['product-1', 'product-2'],
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject empty input', () => {
      const result = validateAccessCheck({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Either productSlug or productSlugs must be provided');
    });

    it('should reject invalid slug format', () => {
      const result = validateAccessCheck({ productSlug: 'Invalid Slug!' });
      expect(result.isValid).toBe(false);
    });

    it('should reject slug starting with hyphen', () => {
      const result = validateAccessCheck({ productSlug: '-invalid' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('cannot start or end with hyphens'))).toBe(true);
    });

    it('should reject slug ending with hyphen', () => {
      const result = validateAccessCheck({ productSlug: 'invalid-' });
      expect(result.isValid).toBe(false);
    });

    it('should reject slug with consecutive hyphens', () => {
      const result = validateAccessCheck({ productSlug: 'invalid--slug' });
      expect(result.isValid).toBe(false);
    });

    it('should reject non-array productSlugs', () => {
      const result = validateAccessCheck({ productSlugs: 'not-an-array' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('productSlugs must be an array');
    });

    it('should reject empty productSlugs array', () => {
      const result = validateAccessCheck({ productSlugs: [] });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('productSlugs cannot be empty');
    });

    it('should reject too many productSlugs', () => {
      const slugs = Array(51).fill('slug');
      const result = validateAccessCheck({ productSlugs: slugs });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('productSlugs cannot contain more than 50 items');
    });

    it('should validate each slug in array', () => {
      const result = validateAccessCheck({
        productSlugs: ['valid-slug', 'Invalid Slug!'],
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('productSlugs[1]'))).toBe(true);
    });

    it('should reject slug longer than 100 characters', () => {
      const longSlug = 'a'.repeat(101);
      const result = validateAccessCheck({ productSlug: longSlug });
      expect(result.isValid).toBe(false);
    });
  });

  describe('sanitizeGrantAccessData', () => {
    it('should remove dangerous fields', () => {
      const data = {
        product_id: 'ABC123',
        id: 'should-be-removed',
        user_id: 'should-be-removed',
        created_at: 'should-be-removed',
        updated_at: 'should-be-removed',
      };
      const result = sanitizeGrantAccessData(data);

      expect(result.id).toBeUndefined();
      expect(result.user_id).toBeUndefined();
      expect(result.created_at).toBeUndefined();
      expect(result.updated_at).toBeUndefined();
    });

    it('should lowercase and trim product_id', () => {
      const result = sanitizeGrantAccessData({ product_id: '  ABC-123  ' });
      expect(result.product_id).toBe('abc-123');
    });

    it('should convert empty expires_at to null', () => {
      const result = sanitizeGrantAccessData({ access_expires_at: '' });
      expect(result.access_expires_at).toBe(null);
    });
  });

  describe('sanitizeUserActionData', () => {
    it('should lowercase and trim UUIDs', () => {
      const result = sanitizeUserActionData({
        userId: '  ABC-123  ',
        productId: '  DEF-456  ',
      });
      expect(result.userId).toBe('abc-123');
      expect(result.productId).toBe('def-456');
    });

    it('should lowercase and trim action', () => {
      const result = sanitizeUserActionData({ action: '  GRANT  ' });
      expect(result.action).toBe('grant');
    });
  });

  describe('sanitizeAccessCheckData', () => {
    it('should lowercase and trim productSlug', () => {
      const result = sanitizeAccessCheckData({ productSlug: '  MY-PRODUCT  ' });
      expect(result.productSlug).toBe('my-product');
    });

    it('should sanitize productSlugs array', () => {
      const result = sanitizeAccessCheckData({
        productSlugs: ['  SLUG-1  ', '  SLUG-2  '],
      });
      expect(result.productSlugs).toEqual(['slug-1', 'slug-2']);
    });

    it('should filter out non-string elements from productSlugs', () => {
      const result = sanitizeAccessCheckData({
        productSlugs: ['valid', null, undefined, 123, 'also-valid'],
      });
      expect(result.productSlugs).toEqual(['valid', 'also-valid']);
    });
  });
});
