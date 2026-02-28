/**
 * Version Utilities Unit Tests
 *
 * Tests for semver comparison logic used by the update system.
 *
 * @see src/lib/version.ts
 */

import { describe, it, expect } from 'vitest';
import { isNewerVersion } from '@/lib/version';

describe('isNewerVersion', () => {
  describe('basic comparisons', () => {
    it('should detect newer major version', () => {
      expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true);
    });

    it('should detect newer minor version', () => {
      expect(isNewerVersion('1.0.0', '1.1.0')).toBe(true);
    });

    it('should detect newer patch version', () => {
      expect(isNewerVersion('1.0.0', '1.0.1')).toBe(true);
    });

    it('should return false for same version', () => {
      expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
    });

    it('should return false when current is newer', () => {
      expect(isNewerVersion('2.0.0', '1.0.0')).toBe(false);
      expect(isNewerVersion('1.1.0', '1.0.0')).toBe(false);
      expect(isNewerVersion('1.0.1', '1.0.0')).toBe(false);
    });
  });

  describe('v-prefix handling', () => {
    it('should handle v prefix on latest', () => {
      expect(isNewerVersion('1.0.0', 'v1.0.1')).toBe(true);
    });

    it('should handle v prefix on current', () => {
      expect(isNewerVersion('v1.0.0', '1.0.1')).toBe(true);
    });

    it('should handle v prefix on both', () => {
      expect(isNewerVersion('v1.0.0', 'v1.0.1')).toBe(true);
      expect(isNewerVersion('v1.0.1', 'v1.0.0')).toBe(false);
    });
  });

  describe('partial versions', () => {
    it('should handle missing patch version', () => {
      expect(isNewerVersion('1.0', '1.0.1')).toBe(true);
    });

    it('should handle shorter current vs longer latest', () => {
      expect(isNewerVersion('1', '1.0.1')).toBe(true);
    });

    it('should treat missing segments as 0', () => {
      expect(isNewerVersion('1.0', '1.0.0')).toBe(false);
      expect(isNewerVersion('1.0.0', '1.0')).toBe(false);
    });
  });

  describe('multi-digit versions', () => {
    it('should compare numerically, not lexicographically', () => {
      expect(isNewerVersion('1.9.0', '1.10.0')).toBe(true);
      expect(isNewerVersion('1.0.9', '1.0.10')).toBe(true);
    });

    it('should handle large version numbers', () => {
      expect(isNewerVersion('10.20.30', '10.20.31')).toBe(true);
      expect(isNewerVersion('10.20.31', '10.20.30')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle 0.x versions', () => {
      expect(isNewerVersion('0.0.1', '0.0.2')).toBe(true);
      expect(isNewerVersion('0.1.0', '0.2.0')).toBe(true);
    });

    it('should handle single-digit versions', () => {
      expect(isNewerVersion('1', '2')).toBe(true);
      expect(isNewerVersion('2', '1')).toBe(false);
    });
  });

  describe('invalid / malformed inputs', () => {
    it('should return false for empty strings', () => {
      expect(isNewerVersion('', '')).toBe(false);
      // NaN from Number('') === 0, so '' vs '1.0.0' → 0.0.0 vs 1.0.0 → true
      expect(isNewerVersion('', '1.0.0')).toBe(true);
    });

    it('should return false when latest is non-numeric', () => {
      // 'abc'.split('.').map(Number) → [NaN], NaN comparisons return false
      expect(isNewerVersion('1.0.0', 'abc')).toBe(false);
    });

    it('should return false when both are non-numeric', () => {
      expect(isNewerVersion('unknown', 'unknown')).toBe(false);
    });

    it('should handle version with trailing dots', () => {
      // '1.0.' → ['1','0',''] → [1, 0, NaN]
      expect(isNewerVersion('1.0.0', '1.0.')).toBe(false);
    });

    it('should not correctly parse pre-release suffixes (known limitation)', () => {
      // '1.0.0-beta.1' → split('.') → ['1','0','0-beta','1'] → [1,0,NaN,1]
      // Segment 3: NaN vs 0 → both (lv > cv) and (lv < cv) are false → continues
      // Segment 4: 1 vs 0 → 1 > 0 → returns true (incorrectly treats beta as newer)
      // This is a known limitation — pre-release versions are not supported
      expect(isNewerVersion('1.0.0', '1.0.0-beta.1')).toBe(true);
    });
  });
});
