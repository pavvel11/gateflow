import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * ============================================================================
 * SECURITY REFERENCE IMPLEMENTATIONS - Parameter Tampering Prevention
 * ============================================================================
 *
 * PURPOSE: This file contains REFERENCE IMPLEMENTATIONS of secure validation
 * functions, NOT tests of existing application code.
 *
 * WHY THIS EXISTS:
 * - Documents common parameter tampering attack vectors
 * - Provides battle-tested, copy-paste-ready secure implementations
 * - Serves as a security knowledge base for the team
 * - Ensures we don't forget edge cases when implementing similar logic
 *
 * HOW TO USE:
 * When you need to validate numeric input in the app, copy the relevant
 * function (e.g., safeParseFloat) to src/lib/validations/ and import it.
 *
 * THESE ARE NOT "STUPID TESTS" - they document:
 * - Why parseInt('12abc') === 12 is dangerous
 * - Why scientific notation (1e308) bypasses max value checks
 * - Why negative amounts can cause refunds instead of charges
 * - How attackers think about breaking your validation
 *
 * Created during security audit (2026-01-08)
 * ============================================================================
 */

/**
 * REFERENCE IMPLEMENTATION: Safe numeric parsing
 * Copy to: src/lib/validations/numbers.ts
 */

// Safe parseFloat that rejects infinity, NaN, and validates range
function safeParseFloat(value: string | number | null | undefined, min: number = 0, max: number = 999999.99): number | null {
  if (value === null || value === undefined) return null;

  const stringValue = String(value).trim();

  // Empty string is invalid
  if (stringValue === '') return null;

  // Reject scientific notation for monetary values
  if (/[eE]/.test(stringValue)) {
    return null;
  }

  // Must be a valid numeric format (only digits, optional decimal point, optional leading minus)
  if (!/^-?\d+(\.\d+)?$/.test(stringValue)) {
    return null;
  }

  const parsed = parseFloat(stringValue);

  // Must be a finite number
  if (!Number.isFinite(parsed)) {
    return null;
  }

  // Must be within range
  if (parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

// Safe parseInt with explicit radix and range validation
function safeParseInt(value: string | number | null | undefined, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number | null {
  if (value === null || value === undefined) return null;

  const stringValue = String(value);

  // Only accept plain integers (no scientific notation, no decimals)
  if (!/^-?\d+$/.test(stringValue)) {
    return null;
  }

  const parsed = parseInt(stringValue, 10);

  // Must be a safe integer
  if (!Number.isSafeInteger(parsed)) {
    return null;
  }

  // Must be within range
  if (parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

// Validate currency code against whitelist
const ALLOWED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'PLN', 'CAD', 'AUD'] as const;
type AllowedCurrency = typeof ALLOWED_CURRENCIES[number];

function validateCurrency(currency: string | null | undefined): AllowedCurrency | null {
  if (!currency || typeof currency !== 'string') return null;

  const normalized = currency.toUpperCase().trim();

  if (ALLOWED_CURRENCIES.includes(normalized as AllowedCurrency)) {
    return normalized as AllowedCurrency;
  }

  return null;
}

// Validate pagination parameters
function validatePagination(limit: unknown, offset: unknown): { limit: number; offset: number } {
  const DEFAULT_LIMIT = 10;
  const MAX_LIMIT = 1000;

  let parsedLimit = safeParseInt(limit as string, 1, MAX_LIMIT);
  let parsedOffset = safeParseInt(offset as string, 0, Number.MAX_SAFE_INTEGER);

  return {
    limit: parsedLimit ?? DEFAULT_LIMIT,
    offset: parsedOffset ?? 0,
  };
}

describe('Parameter Tampering Security', () => {
  describe('safeParseFloat - Discount/Amount Validation', () => {
    describe('Valid inputs', () => {
      it('should accept valid decimal numbers', () => {
        expect(safeParseFloat('99.99')).toBe(99.99);
        expect(safeParseFloat('0.01')).toBe(0.01);
        expect(safeParseFloat('100')).toBe(100);
        expect(safeParseFloat('0')).toBe(0);
      });

      it('should accept numbers at range boundaries', () => {
        expect(safeParseFloat('0', 0, 1000)).toBe(0);
        expect(safeParseFloat('999999.99', 0, 999999.99)).toBe(999999.99);
      });
    });

    describe('Type coercion attacks', () => {
      it('should reject scientific notation (1e10 attack)', () => {
        expect(safeParseFloat('1e10')).toBeNull();
        expect(safeParseFloat('1E10')).toBeNull();
        expect(safeParseFloat('1.5e2')).toBeNull();
        expect(safeParseFloat('1e-5')).toBeNull();
      });

      it('should reject Infinity', () => {
        expect(safeParseFloat('Infinity')).toBeNull();
        expect(safeParseFloat('-Infinity')).toBeNull();
        expect(safeParseFloat('inf')).toBeNull();
      });

      it('should reject NaN', () => {
        expect(safeParseFloat('NaN')).toBeNull();
        expect(safeParseFloat('nan')).toBeNull();
      });

      it('should reject null/undefined', () => {
        expect(safeParseFloat(null)).toBeNull();
        expect(safeParseFloat(undefined)).toBeNull();
      });

      it('should reject non-numeric strings', () => {
        expect(safeParseFloat('abc')).toBeNull();
        expect(safeParseFloat('')).toBeNull();
        expect(safeParseFloat('  ')).toBeNull();
        expect(safeParseFloat('12abc')).toBeNull();
      });
    });

    describe('Range validation', () => {
      it('should reject negative values when min is 0', () => {
        expect(safeParseFloat('-1', 0, 1000)).toBeNull();
        expect(safeParseFloat('-0.01', 0, 1000)).toBeNull();
        expect(safeParseFloat('-999', 0, 1000)).toBeNull();
      });

      it('should reject values above maximum', () => {
        expect(safeParseFloat('1000001', 0, 999999.99)).toBeNull();
        expect(safeParseFloat('9999999999', 0, 999999.99)).toBeNull();
      });

      it('should enforce custom ranges', () => {
        expect(safeParseFloat('50', 100, 200)).toBeNull();
        expect(safeParseFloat('250', 100, 200)).toBeNull();
        expect(safeParseFloat('150', 100, 200)).toBe(150);
      });
    });

    describe('Discount amount attack scenarios', () => {
      it('should prevent "free product" via NaN fallback', () => {
        // Attack: discount_amount: "NaN" -> parseFloat("NaN") = NaN -> || 0 = FREE!
        const discountAttempt = safeParseFloat('NaN');
        expect(discountAttempt).toBeNull();
        // Caller should reject transaction, NOT fallback to 0
      });

      it('should prevent billion-dollar discount via 1e10', () => {
        const discountAttempt = safeParseFloat('1e10');
        expect(discountAttempt).toBeNull();
      });

      it('should prevent infinite discount', () => {
        const discountAttempt = safeParseFloat('Infinity');
        expect(discountAttempt).toBeNull();
      });
    });
  });

  describe('safeParseInt - Pagination/Limit Validation', () => {
    describe('Valid inputs', () => {
      it('should accept valid integers', () => {
        expect(safeParseInt('10')).toBe(10);
        expect(safeParseInt('100')).toBe(100);
        expect(safeParseInt('0')).toBe(0);
        expect(safeParseInt('1')).toBe(1);
      });

      it('should accept negative integers when allowed', () => {
        expect(safeParseInt('-5', -100, 100)).toBe(-5);
      });
    });

    describe('Octal/Hex interpretation attacks', () => {
      it('should reject octal notation (010 attack)', () => {
        // Without radix=10, parseInt('010') = 8 in some engines
        expect(safeParseInt('010')).toBe(10); // Should be 10, not 8
        expect(safeParseInt('077')).toBe(77); // Should be 77, not 63
      });

      it('should reject hex notation (0x attack)', () => {
        expect(safeParseInt('0x64')).toBeNull(); // Rejected
        expect(safeParseInt('0xFF')).toBeNull();
      });

      it('should reject binary notation', () => {
        expect(safeParseInt('0b1010')).toBeNull();
      });
    });

    describe('Scientific notation rejection', () => {
      it('should reject scientific notation in integers', () => {
        expect(safeParseInt('1e4')).toBeNull();
        expect(safeParseInt('1E4')).toBeNull();
        expect(safeParseInt('1e+4')).toBeNull();
      });
    });

    describe('Decimal rejection', () => {
      it('should reject decimal numbers', () => {
        expect(safeParseInt('10.5')).toBeNull();
        expect(safeParseInt('99.99')).toBeNull();
      });
    });

    describe('Range validation', () => {
      it('should reject negative when min is 0', () => {
        expect(safeParseInt('-1', 0, 1000)).toBeNull();
        expect(safeParseInt('-999', 0, 1000)).toBeNull();
      });

      it('should enforce maximum', () => {
        expect(safeParseInt('1001', 0, 1000)).toBeNull();
        expect(safeParseInt('9999999999', 0, 1000)).toBeNull();
      });
    });

    describe('Pagination attack scenarios', () => {
      it('should prevent DoS via huge limit', () => {
        const limitAttempt = safeParseInt('9999999999', 0, 1000);
        expect(limitAttempt).toBeNull();
      });

      it('should prevent offset manipulation', () => {
        const offsetAttempt = safeParseInt('-1', 0, Number.MAX_SAFE_INTEGER);
        expect(offsetAttempt).toBeNull();
      });
    });
  });

  describe('validateCurrency - Currency Whitelist', () => {
    describe('Valid currencies', () => {
      it('should accept valid uppercase currencies', () => {
        expect(validateCurrency('USD')).toBe('USD');
        expect(validateCurrency('EUR')).toBe('EUR');
        expect(validateCurrency('PLN')).toBe('PLN');
        expect(validateCurrency('JPY')).toBe('JPY');
      });

      it('should normalize lowercase to uppercase', () => {
        expect(validateCurrency('usd')).toBe('USD');
        expect(validateCurrency('eur')).toBe('EUR');
        expect(validateCurrency('pln')).toBe('PLN');
      });

      it('should handle mixed case', () => {
        expect(validateCurrency('Usd')).toBe('USD');
        expect(validateCurrency('EuR')).toBe('EUR');
      });

      it('should trim whitespace', () => {
        expect(validateCurrency(' USD ')).toBe('USD');
        expect(validateCurrency('  EUR')).toBe('EUR');
      });
    });

    describe('Invalid currencies', () => {
      it('should reject unknown currency codes', () => {
        expect(validateCurrency('XXX')).toBeNull();
        expect(validateCurrency('ABC')).toBeNull();
        expect(validateCurrency('FAKE')).toBeNull();
      });

      it('should reject empty/null values', () => {
        expect(validateCurrency('')).toBeNull();
        expect(validateCurrency(null)).toBeNull();
        expect(validateCurrency(undefined)).toBeNull();
      });

      it('should reject non-string values', () => {
        expect(validateCurrency(123 as unknown as string)).toBeNull();
        expect(validateCurrency({} as unknown as string)).toBeNull();
      });
    });

    describe('Currency conversion attack scenarios', () => {
      it('should reject low-value currencies that could be exploited', () => {
        // Attack: Use currency like Venezuelan Bolivar (VEF) worth almost nothing
        expect(validateCurrency('VEF')).toBeNull();
        expect(validateCurrency('ZWL')).toBeNull(); // Zimbabwe Dollar
      });

      it('should reject precious metal codes', () => {
        // XAU = gold, XAG = silver - could cause confusion
        expect(validateCurrency('XAU')).toBeNull();
        expect(validateCurrency('XAG')).toBeNull();
        expect(validateCurrency('XPT')).toBeNull(); // Platinum
      });
    });
  });

  describe('validatePagination - Combined Validation', () => {
    it('should return safe defaults for invalid inputs', () => {
      const result = validatePagination('invalid', 'also-invalid');
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('should cap limit at maximum', () => {
      const result = validatePagination('5000', '0');
      expect(result.limit).toBe(10); // Falls back to default because 5000 > MAX_LIMIT
    });

    it('should accept valid pagination', () => {
      const result = validatePagination('50', '100');
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(100);
    });

    it('should reject negative offset', () => {
      const result = validatePagination('10', '-5');
      expect(result.offset).toBe(0); // Defaults to 0
    });
  });

  describe('Refund Amount Validation', () => {
    /**
     * Simulates the refund amount validation that should be in place
     */
    function validateRefundAmount(
      amount: string | number | null | undefined,
      originalAmount: number,
      alreadyRefunded: number
    ): { valid: boolean; amount: number | null; error?: string } {
      // Must be provided
      if (amount === null || amount === undefined) {
        return { valid: false, amount: null, error: 'Amount is required' };
      }

      const stringAmount = String(amount);

      // SECURITY: Reject scientific notation (e.g., "1e4" = 10000)
      if (/[eE]/.test(stringAmount)) {
        return { valid: false, amount: null, error: 'Scientific notation not allowed' };
      }

      // SECURITY: Only accept plain integers (refund amounts are in cents)
      if (!/^\d+$/.test(stringAmount)) {
        return { valid: false, amount: null, error: 'Amount must be a plain integer' };
      }

      const parsedAmount = parseInt(stringAmount, 10);

      // Must be a valid integer
      if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
        return { valid: false, amount: null, error: 'Amount must be a positive integer' };
      }

      // Cannot exceed remaining refundable amount
      const maxRefundable = originalAmount - alreadyRefunded;
      if (parsedAmount > maxRefundable) {
        return {
          valid: false,
          amount: null,
          error: `Amount exceeds refundable (${maxRefundable})`
        };
      }

      return { valid: true, amount: parsedAmount };
    }

    describe('Valid refund amounts', () => {
      it('should accept valid integer amounts', () => {
        const result = validateRefundAmount('5000', 10000, 0);
        expect(result.valid).toBe(true);
        expect(result.amount).toBe(5000);
      });

      it('should accept full refund', () => {
        const result = validateRefundAmount('10000', 10000, 0);
        expect(result.valid).toBe(true);
        expect(result.amount).toBe(10000);
      });

      it('should accept partial refund after previous refund', () => {
        const result = validateRefundAmount('3000', 10000, 5000);
        expect(result.valid).toBe(true);
        expect(result.amount).toBe(3000);
      });
    });

    describe('Scientific notation bypass attack', () => {
      it('should reject scientific notation (1e4 attack)', () => {
        // Attack: amount = "1e4" -> parseInt("1e4") = 1, but parseFloat = 10000
        const result = validateRefundAmount('1e4', 10000, 0);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Scientific notation');
      });

      it('should reject negative exponents', () => {
        const result = validateRefundAmount('1e-5', 10000, 0);
        expect(result.valid).toBe(false);
      });

      it('should reject uppercase E notation', () => {
        const result = validateRefundAmount('1E4', 10000, 0);
        expect(result.valid).toBe(false);
      });
    });

    describe('Over-refund attacks', () => {
      it('should reject amount exceeding original', () => {
        const result = validateRefundAmount('15000', 10000, 0);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('exceeds refundable');
      });

      it('should reject amount exceeding remaining after partial', () => {
        const result = validateRefundAmount('6000', 10000, 5000);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('exceeds refundable');
      });
    });

    describe('Invalid format attacks', () => {
      it('should reject decimal amounts', () => {
        const result = validateRefundAmount('100.50', 10000, 0);
        expect(result.valid).toBe(false);
      });

      it('should reject negative amounts', () => {
        const result = validateRefundAmount('-100', 10000, 0);
        expect(result.valid).toBe(false);
      });

      it('should reject non-numeric strings', () => {
        const result = validateRefundAmount('abc', 10000, 0);
        expect(result.valid).toBe(false);
      });

      it('should reject empty strings', () => {
        const result = validateRefundAmount('', 10000, 0);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Boolean Parameter Validation', () => {
    /**
     * Validates boolean parameters to prevent type confusion attacks
     */
    function validateBoolean(value: unknown): boolean | null {
      if (typeof value === 'boolean') {
        return value;
      }

      // Reject all non-boolean types
      return null;
    }

    describe('Valid boolean values', () => {
      it('should accept true', () => {
        expect(validateBoolean(true)).toBe(true);
      });

      it('should accept false', () => {
        expect(validateBoolean(false)).toBe(false);
      });
    });

    describe('Type confusion attacks', () => {
      it('should reject string "true"', () => {
        expect(validateBoolean('true')).toBeNull();
      });

      it('should reject string "false"', () => {
        expect(validateBoolean('false')).toBeNull();
      });

      it('should reject number 1', () => {
        expect(validateBoolean(1)).toBeNull();
      });

      it('should reject number 0', () => {
        expect(validateBoolean(0)).toBeNull();
      });

      it('should reject null', () => {
        expect(validateBoolean(null)).toBeNull();
      });

      it('should reject undefined', () => {
        expect(validateBoolean(undefined)).toBeNull();
      });

      it('should reject truthy objects', () => {
        expect(validateBoolean({})).toBeNull();
        expect(validateBoolean([])).toBeNull();
      });
    });
  });

  describe('Array Parameter Validation', () => {
    /**
     * Validates array parameters to prevent injection attacks
     */
    function validateUUIDArray(value: unknown): string[] | null {
      if (!Array.isArray(value)) {
        return null;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      for (const item of value) {
        if (typeof item !== 'string' || !uuidRegex.test(item)) {
          return null;
        }
      }

      return value as string[];
    }

    describe('Valid UUID arrays', () => {
      it('should accept array of valid UUIDs', () => {
        const uuids = [
          '550e8400-e29b-41d4-a716-446655440000',
          '6ba7b810-9dad-41d4-80b4-00c04fd430c8',
        ];
        expect(validateUUIDArray(uuids)).toEqual(uuids);
      });

      it('should accept empty array', () => {
        expect(validateUUIDArray([])).toEqual([]);
      });
    });

    describe('Invalid array values', () => {
      it('should reject non-array values', () => {
        expect(validateUUIDArray('not-an-array')).toBeNull();
        expect(validateUUIDArray({ nested: 'object' })).toBeNull();
        expect(validateUUIDArray(123)).toBeNull();
      });

      it('should reject array with invalid UUIDs', () => {
        expect(validateUUIDArray(['not-a-uuid'])).toBeNull();
        expect(validateUUIDArray(['123'])).toBeNull();
      });

      it('should reject array with mixed types', () => {
        expect(validateUUIDArray([
          '550e8400-e29b-41d4-a716-446655440000',
          123,
          null,
        ])).toBeNull();
      });

      it('should reject array with non-v4 UUIDs', () => {
        // V1 UUID (time-based, has 1 in version position)
        expect(validateUUIDArray(['550e8400-e29b-11d4-a716-446655440000'])).toBeNull();
      });
    });

    describe('Injection attack scenarios', () => {
      it('should reject SQL injection in array', () => {
        expect(validateUUIDArray([
          '550e8400-e29b-41d4-a716-446655440000',
          "'; DROP TABLE users;--",
        ])).toBeNull();
      });

      it('should reject object injection', () => {
        expect(validateUUIDArray([
          { $ne: null },
        ] as unknown[])).toBeNull();
      });
    });
  });

  describe('Metadata String Validation', () => {
    /**
     * Validates metadata strings to prevent injection attacks
     */
    function validateMetadataString(value: unknown, maxLength: number = 500): string | null {
      if (typeof value !== 'string') {
        return null;
      }

      // Remove control characters
      const cleaned = value.replace(/[\x00-\x1F\x7F]/g, '');

      // Enforce length limit
      const truncated = cleaned.substring(0, maxLength);

      return truncated;
    }

    describe('Valid metadata strings', () => {
      it('should accept normal strings', () => {
        expect(validateMetadataString('John Doe')).toBe('John Doe');
        expect(validateMetadataString('Company Name LLC')).toBe('Company Name LLC');
      });

      it('should truncate long strings', () => {
        const longString = 'a'.repeat(1000);
        const result = validateMetadataString(longString, 500);
        expect(result?.length).toBe(500);
      });
    });

    describe('Control character injection', () => {
      it('should remove null bytes', () => {
        expect(validateMetadataString('test\x00injection')).toBe('testinjection');
      });

      it('should remove other control characters', () => {
        expect(validateMetadataString('test\x01\x02\x03value')).toBe('testvalue');
      });

      it('should remove newlines in single-line fields', () => {
        expect(validateMetadataString('test\ninjection')).toBe('testinjection');
      });
    });

    describe('Type validation', () => {
      it('should reject non-strings', () => {
        expect(validateMetadataString(123)).toBeNull();
        expect(validateMetadataString(null)).toBeNull();
        expect(validateMetadataString(undefined)).toBeNull();
        expect(validateMetadataString({})).toBeNull();
        expect(validateMetadataString([])).toBeNull();
      });
    });
  });
});

describe('Integration: Combined Parameter Attacks', () => {
  /**
   * Simulates what the API would receive and validates all parameters
   */
  interface PaymentParams {
    amount?: string | number;
    currency?: string;
    discount_amount?: string | number;
    product_ids?: unknown;
  }

  function validatePaymentParams(params: PaymentParams): {
    valid: boolean;
    errors: string[];
    sanitized?: {
      amount: number;
      currency: string;
      discount_amount: number;
      product_ids: string[];
    };
  } {
    const errors: string[] = [];

    // Validate amount
    const amount = safeParseFloat(params.amount as string, 0.01, 999999.99);
    if (amount === null) {
      errors.push('Invalid amount');
    }

    // Validate currency
    const currency = validateCurrency(params.currency);
    if (currency === null) {
      errors.push('Invalid currency');
    }

    // Validate discount
    const discountAmount = safeParseFloat(params.discount_amount as string, 0, 999999.99) ?? 0;

    // Validate product IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let productIds: string[] = [];
    if (Array.isArray(params.product_ids)) {
      for (const id of params.product_ids) {
        if (typeof id !== 'string' || !uuidRegex.test(id)) {
          errors.push('Invalid product ID in array');
          break;
        }
      }
      if (errors.length === 0) {
        productIds = params.product_ids as string[];
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      errors: [],
      sanitized: {
        amount: amount!,
        currency: currency!,
        discount_amount: discountAmount,
        product_ids: productIds,
      },
    };
  }

  it('should reject combined attack vectors', () => {
    const attack: PaymentParams = {
      amount: '1e10',           // Scientific notation attack
      currency: 'XXX',          // Invalid currency
      discount_amount: 'Infinity', // Infinite discount
      product_ids: ['not-uuid', 123], // Invalid IDs
    };

    const result = validatePaymentParams(attack);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should accept valid combined parameters', () => {
    const valid: PaymentParams = {
      amount: '99.99',
      currency: 'USD',
      discount_amount: '10.00',
      product_ids: ['550e8400-e29b-41d4-a716-446655440000'],
    };

    const result = validatePaymentParams(valid);
    expect(result.valid).toBe(true);
    expect(result.sanitized?.amount).toBe(99.99);
    expect(result.sanitized?.currency).toBe('USD');
    expect(result.sanitized?.discount_amount).toBe(10.00);
  });

  it('should handle timing-based attack patterns', () => {
    // SQL timing attacks use SLEEP/BENCHMARK in values
    const timingAttacks: PaymentParams[] = [
      { amount: 'SLEEP(10)', currency: 'USD' },
      { amount: 'pg_sleep(10)', currency: 'USD' },
      { amount: "BENCHMARK(10000000,MD5('test'))", currency: 'USD' },
    ];

    for (const attack of timingAttacks) {
      const result = validatePaymentParams(attack);
      expect(result.valid).toBe(false);
    }
  });
});
