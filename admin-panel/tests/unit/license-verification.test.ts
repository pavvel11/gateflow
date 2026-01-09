/**
 * Unit tests for license verification
 */

import { describe, it, expect } from 'vitest';
import {
  parseLicense,
  verifyLicenseSignature,
  parseExpiryDate,
  isLicenseExpired,
  doesDomainMatch,
  extractDomainFromUrl,
  getLicenseInfo,
  validateLicense,
  isValidLicenseFormat,
} from '../../src/lib/license/verify';

describe('License Verification', () => {
  // Valid test licenses generated with /Users/pavvel/workspace/gateflow/scripts/generate-license.js
  // These are real signatures that should verify correctly
  const VALID_LICENSE_UNLIMITED = 'GF-test.example.com-UNLIMITED-MEUCIFu0eHmjYGTkO2LeOf-H9wbPADxtb2e2y9zwI-UbNs2IAiEA9zLeqLOTNsyeIR8APM0wkZOcKY4RYJw2T_DqPWfjCwQ';
  const VALID_LICENSE_DATED = 'GF-test.example.com-20301231-MEUCIQCs9QVA6-9uwH2wdoNy3UAlR_bzB4IivExlM1KeqUgPiQIgKNkpD5XEFVKMELTu8T3RAhi80hOuRnSWaef0T-JNSFA';
  const EXPIRED_LICENSE = 'GF-test.example.com-20201231-MEUCIGHfTwXx0_VbMaS1iK4uZ9yx72FzyDJ0iu4_1wMjz4mAAiEAwHCJIx1owoyCTg4xDqaSnVhHKxCtl4pdJkyrZ3p7pAo';

  // Invalid license (tampered signature)
  const INVALID_LICENSE = 'GF-test.example.com-UNLIMITED-INVALID_SIGNATURE_HERE';
  const MALFORMED_LICENSE = 'not-a-valid-license';

  describe('parseLicense', () => {
    it('should parse valid unlimited license', () => {
      const result = parseLicense(VALID_LICENSE_UNLIMITED);
      expect(result).not.toBeNull();
      expect(result?.prefix).toBe('GF');
      expect(result?.domain).toBe('test.example.com');
      expect(result?.expiry).toBe('UNLIMITED');
      expect(result?.signature).toBeTruthy();
    });

    it('should parse valid dated license', () => {
      const result = parseLicense(VALID_LICENSE_DATED);
      expect(result).not.toBeNull();
      expect(result?.prefix).toBe('GF');
      expect(result?.domain).toBe('test.example.com');
      expect(result?.expiry).toBe('20301231');
    });

    it('should return null for malformed license', () => {
      const result = parseLicense(MALFORMED_LICENSE);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseLicense('');
      expect(result).toBeNull();
    });
  });

  describe('verifyLicenseSignature', () => {
    it('should verify valid unlimited license signature', () => {
      const isValid = verifyLicenseSignature(VALID_LICENSE_UNLIMITED);
      expect(isValid).toBe(true);
    });

    it('should verify valid dated license signature', () => {
      const isValid = verifyLicenseSignature(VALID_LICENSE_DATED);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const isValid = verifyLicenseSignature(INVALID_LICENSE);
      expect(isValid).toBe(false);
    });

    it('should reject malformed license', () => {
      const isValid = verifyLicenseSignature(MALFORMED_LICENSE);
      expect(isValid).toBe(false);
    });

    it('should reject tampered domain', () => {
      // Take valid license and change domain
      const tampered = VALID_LICENSE_UNLIMITED.replace('test.example.com', 'hacker.com');
      const isValid = verifyLicenseSignature(tampered);
      expect(isValid).toBe(false);
    });

    it('should reject tampered expiry', () => {
      // Take valid dated license and change expiry
      const tampered = VALID_LICENSE_DATED.replace('20301231', '20991231');
      const isValid = verifyLicenseSignature(tampered);
      expect(isValid).toBe(false);
    });
  });

  describe('parseExpiryDate', () => {
    it('should return null for UNLIMITED', () => {
      const result = parseExpiryDate('UNLIMITED');
      expect(result).toBeNull();
    });

    it('should parse valid date', () => {
      const result = parseExpiryDate('20301231');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2030);
      expect(result?.getMonth()).toBe(11); // December (0-indexed)
      expect(result?.getDate()).toBe(31);
    });

    it('should return null for invalid format', () => {
      expect(parseExpiryDate('2030-12-31')).toBeNull();
      expect(parseExpiryDate('invalid')).toBeNull();
      expect(parseExpiryDate('123')).toBeNull();
    });
  });

  describe('isLicenseExpired', () => {
    it('should return false for UNLIMITED', () => {
      expect(isLicenseExpired('UNLIMITED')).toBe(false);
    });

    it('should return false for future date', () => {
      expect(isLicenseExpired('20991231')).toBe(false);
    });

    it('should return true for past date', () => {
      expect(isLicenseExpired('20201231')).toBe(true);
    });
  });

  describe('doesDomainMatch', () => {
    it('should match exact domain', () => {
      expect(doesDomainMatch('example.com', 'example.com')).toBe(true);
    });

    it('should match with different case', () => {
      expect(doesDomainMatch('Example.COM', 'example.com')).toBe(true);
    });

    it('should match removing www prefix', () => {
      expect(doesDomainMatch('www.example.com', 'example.com')).toBe(true);
      expect(doesDomainMatch('example.com', 'www.example.com')).toBe(true);
    });

    it('should match wildcard to subdomain', () => {
      expect(doesDomainMatch('*.example.com', 'app.example.com')).toBe(true);
      expect(doesDomainMatch('*.example.com', 'www.example.com')).toBe(true);
    });

    it('should match wildcard to base domain', () => {
      expect(doesDomainMatch('*.example.com', 'example.com')).toBe(true);
    });

    it('should not match different domains', () => {
      expect(doesDomainMatch('example.com', 'other.com')).toBe(false);
    });

    it('should not match subdomain to base domain license', () => {
      expect(doesDomainMatch('example.com', 'app.example.com')).toBe(false);
    });
  });

  describe('extractDomainFromUrl', () => {
    it('should extract domain from full URL', () => {
      expect(extractDomainFromUrl('https://example.com/path')).toBe('example.com');
      expect(extractDomainFromUrl('https://app.example.com:3000/path?query=1')).toBe('app.example.com');
    });

    it('should return plain domain as-is', () => {
      expect(extractDomainFromUrl('example.com')).toBe('example.com');
    });

    it('should return null for invalid URL', () => {
      expect(extractDomainFromUrl('not a url at all!')).toBeNull();
    });
  });

  describe('getLicenseInfo', () => {
    it('should return valid info for valid unlimited license', () => {
      const info = getLicenseInfo(VALID_LICENSE_UNLIMITED);
      expect(info.valid).toBe(true);
      expect(info.domain).toBe('test.example.com');
      expect(info.expiry).toBe('UNLIMITED');
      expect(info.expiryDate).toBeNull();
      expect(info.isExpired).toBe(false);
      expect(info.error).toBeUndefined();
    });

    it('should return valid info for valid dated license', () => {
      const info = getLicenseInfo(VALID_LICENSE_DATED);
      expect(info.valid).toBe(true);
      expect(info.domain).toBe('test.example.com');
      expect(info.expiry).toBe('20301231');
      expect(info.expiryDate).toBeInstanceOf(Date);
      expect(info.isExpired).toBe(false);
    });

    it('should return invalid for malformed license', () => {
      const info = getLicenseInfo(MALFORMED_LICENSE);
      expect(info.valid).toBe(false);
      expect(info.error).toBe('Invalid license format');
    });

    it('should return invalid for bad signature', () => {
      const info = getLicenseInfo(INVALID_LICENSE);
      expect(info.valid).toBe(false);
      expect(info.error).toBe('Invalid license signature');
    });
  });

  describe('validateLicense (full validation)', () => {
    it('should validate valid license without domain check', () => {
      const result = validateLicense(VALID_LICENSE_UNLIMITED);
      expect(result.valid).toBe(true);
      expect(result.domainMatch).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate valid license with matching domain', () => {
      const result = validateLicense(VALID_LICENSE_UNLIMITED, 'test.example.com');
      expect(result.valid).toBe(true);
      expect(result.domainMatch).toBe(true);
    });

    it('should reject valid license with non-matching domain', () => {
      const result = validateLicense(VALID_LICENSE_UNLIMITED, 'other-domain.com');
      expect(result.valid).toBe(false);
      expect(result.domainMatch).toBe(false);
      expect(result.error).toContain('not "other-domain.com"');
    });

    it('should reject invalid signature', () => {
      const result = validateLicense(INVALID_LICENSE, 'test.example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid license signature');
    });

    it('should reject empty license', () => {
      const result = validateLicense('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No license key provided');
    });
  });

  describe('isValidLicenseFormat', () => {
    it('should accept valid format', () => {
      expect(isValidLicenseFormat('GF-example.com-UNLIMITED-abc123')).toBe(true);
      expect(isValidLicenseFormat('GF-example.com-20301231-abc123_XYZ')).toBe(true);
      expect(isValidLicenseFormat('GF-*.example.com-UNLIMITED-sig')).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(isValidLicenseFormat('invalid')).toBe(false);
      expect(isValidLicenseFormat('GF-domain')).toBe(false);
      expect(isValidLicenseFormat('XX-domain-UNLIMITED-sig')).toBe(false);
    });
  });
});
