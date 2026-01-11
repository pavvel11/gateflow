/**
 * Profile Validation Unit Tests
 *
 * Tests for user profile field validation.
 */

import { describe, it, expect } from 'vitest';
import { validateProfile } from '@/lib/validations/profile';
import type { ProfileInput } from '@/lib/validations/profile';

describe('Profile Validation', () => {
  describe('validateProfile', () => {
    it('should validate empty profile', () => {
      const result = validateProfile({});
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should validate valid profile', () => {
      const profile: ProfileInput = {
        first_name: 'John',
        last_name: 'Doe',
        company_name: 'Acme Inc',
        tax_id: '1234567890',
        zip_code: '12345',
      };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(true);
    });

    it('should reject first_name longer than 100 characters', () => {
      const result = validateProfile({ first_name: 'a'.repeat(101) });
      expect(result.isValid).toBe(false);
      expect(result.errors.first_name).toContain('First name is too long');
    });

    it('should allow first_name of exactly 100 characters', () => {
      const result = validateProfile({ first_name: 'a'.repeat(100) });
      expect(result.isValid).toBe(true);
    });

    it('should reject last_name longer than 100 characters', () => {
      const result = validateProfile({ last_name: 'b'.repeat(101) });
      expect(result.isValid).toBe(false);
      expect(result.errors.last_name).toContain('Last name is too long');
    });

    it('should allow last_name of exactly 100 characters', () => {
      const result = validateProfile({ last_name: 'b'.repeat(100) });
      expect(result.isValid).toBe(true);
    });

    it('should reject short tax_id', () => {
      const result = validateProfile({ tax_id: '1234' });
      expect(result.isValid).toBe(false);
      expect(result.errors.tax_id).toContain('Tax ID seems too short');
    });

    it('should validate tax_id with hyphens/spaces', () => {
      const result = validateProfile({ tax_id: '123-456-78901' });
      expect(result.isValid).toBe(true);
    });

    it('should validate alphanumeric tax_id', () => {
      const result = validateProfile({ tax_id: 'GB123456789' });
      expect(result.isValid).toBe(true);
    });

    it('should reject zip_code longer than 20 characters', () => {
      const result = validateProfile({ zip_code: '1'.repeat(21) });
      expect(result.isValid).toBe(false);
      expect(result.errors.zip_code).toContain('Invalid zip code format');
    });

    it('should allow zip_code of 20 characters', () => {
      const result = validateProfile({ zip_code: '1'.repeat(20) });
      expect(result.isValid).toBe(true);
    });

    it('should allow null values for optional fields', () => {
      const profile: ProfileInput = {
        first_name: null,
        last_name: null,
        tax_id: null,
        zip_code: null,
      };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(true);
    });

    it('should accumulate multiple errors', () => {
      const profile: ProfileInput = {
        first_name: 'a'.repeat(101),
        last_name: 'b'.repeat(101),
        tax_id: '123',
        zip_code: '1'.repeat(25),
      };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors)).toHaveLength(4);
    });

    it('should handle fields not explicitly validated', () => {
      const profile: ProfileInput = {
        full_name: 'Test User',
        display_name: 'testuser',
        company_name: 'Company',
        address_line1: '123 Main St',
        address_line2: 'Apt 4',
        city: 'New York',
        state: 'NY',
        country: 'US',
        preferred_language: 'en',
        timezone: 'America/New_York',
      };
      const result = validateProfile(profile);
      expect(result.isValid).toBe(true);
    });
  });
});
