import { test, expect } from '@playwright/test';
import { validateProfile } from '../src/lib/validations/profile';

test.describe('Profile Validation Logic', () => {
  
  test('should accept a valid profile', () => {
    const result = validateProfile({
      first_name: 'Jan',
      last_name: 'Kowalski',
      tax_id: 'PL1234567890',
      zip_code: '00-001'
    });
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  test('should reject too long names', () => {
    const result = validateProfile({
      first_name: 'A'.repeat(101)
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.first_name).toContain('First name is too long');
  });

  test('should reject invalid tax_id', () => {
    const result = validateProfile({
      tax_id: '123' // Too short
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.tax_id).toContain('Tax ID seems too short');
  });

  test('should reject invalid zip code', () => {
    const result = validateProfile({
      zip_code: 'A'.repeat(21)
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.zip_code).toContain('Invalid zip code format');
  });
});
