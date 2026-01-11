/**
 * Pagination Utilities Unit Tests
 *
 * Tests for cursor encoding/decoding, limit parsing, and pagination response creation.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  encodeCursor,
  decodeCursor,
  parseLimit,
  createPaginationResponse,
  applyCursorToQuery,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '@/lib/api/pagination';

describe('Pagination', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('should encode and decode cursor correctly', () => {
      const data = {
        field: 'created_at',
        value: '2024-01-15T10:30:00Z',
        id: 'uuid-123',
        direction: 'desc' as const,
      };

      const encoded = encodeCursor(data);
      const decoded = decodeCursor(encoded);

      expect(decoded).toEqual(data);
    });

    it('should return base64url encoded string', () => {
      const data = {
        field: 'name',
        value: 'Test Product',
        id: 'abc-123',
        direction: 'asc' as const,
      };

      const encoded = encodeCursor(data);
      // Base64url should not contain +, /, or =
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('should handle special characters in values', () => {
      const data = {
        field: 'name',
        value: 'Product with "quotes" & <special> chars',
        id: 'id-with-dash',
        direction: 'desc' as const,
      };

      const encoded = encodeCursor(data);
      const decoded = decodeCursor(encoded);

      expect(decoded?.value).toBe(data.value);
    });

    it('should handle unicode in values', () => {
      const data = {
        field: 'name',
        value: 'Продукт 日本語 한국어',
        id: 'unicode-id',
        direction: 'asc' as const,
      };

      const encoded = encodeCursor(data);
      const decoded = decodeCursor(encoded);

      expect(decoded?.value).toBe(data.value);
    });

    it('should handle empty string value', () => {
      const data = {
        field: 'description',
        value: '',
        id: 'empty-desc',
        direction: 'desc' as const,
      };

      const encoded = encodeCursor(data);
      const decoded = decodeCursor(encoded);

      expect(decoded?.value).toBe('');
    });
  });

  describe('decodeCursor validation', () => {
    it('should return null for invalid base64', () => {
      expect(decodeCursor('not-valid-base64!!!')).toBe(null);
    });

    it('should return null for valid base64 but invalid JSON', () => {
      const invalidJson = Buffer.from('not json').toString('base64url');
      expect(decodeCursor(invalidJson)).toBe(null);
    });

    it('should return null for missing field', () => {
      const data = { value: 'test', id: '123', direction: 'asc' };
      const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
      expect(decodeCursor(encoded)).toBe(null);
    });

    it('should return null for missing value', () => {
      const data = { field: 'name', id: '123', direction: 'asc' };
      const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
      expect(decodeCursor(encoded)).toBe(null);
    });

    it('should return null for missing id', () => {
      const data = { field: 'name', value: 'test', direction: 'asc' };
      const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
      expect(decodeCursor(encoded)).toBe(null);
    });

    it('should return null for invalid direction', () => {
      const data = { field: 'name', value: 'test', id: '123', direction: 'invalid' };
      const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
      expect(decodeCursor(encoded)).toBe(null);
    });

    it('should return null for non-string field', () => {
      const data = { field: 123, value: 'test', id: '123', direction: 'asc' };
      const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
      expect(decodeCursor(encoded)).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(decodeCursor('')).toBe(null);
    });
  });

  describe('parseLimit', () => {
    it('should return default for null input', () => {
      expect(parseLimit(null)).toBe(DEFAULT_LIMIT);
    });

    it('should return default for empty string', () => {
      expect(parseLimit('')).toBe(DEFAULT_LIMIT);
    });

    it('should parse valid number', () => {
      expect(parseLimit('50')).toBe(50);
    });

    it('should return default for non-numeric string', () => {
      expect(parseLimit('abc')).toBe(DEFAULT_LIMIT);
      expect(parseLimit('12.5')).toBe(12);
    });

    it('should return default for zero', () => {
      expect(parseLimit('0')).toBe(DEFAULT_LIMIT);
    });

    it('should return default for negative number', () => {
      expect(parseLimit('-10')).toBe(DEFAULT_LIMIT);
    });

    it('should cap at MAX_LIMIT', () => {
      expect(parseLimit('1000')).toBe(MAX_LIMIT);
      expect(parseLimit('999999')).toBe(MAX_LIMIT);
    });

    it('should return exact value at boundary', () => {
      expect(parseLimit(String(MAX_LIMIT))).toBe(MAX_LIMIT);
      expect(parseLimit('1')).toBe(1);
    });
  });

  describe('createPaginationResponse', () => {
    const sampleItems = [
      { id: '1', name: 'Item 1', created_at: '2024-01-01' },
      { id: '2', name: 'Item 2', created_at: '2024-01-02' },
      { id: '3', name: 'Item 3', created_at: '2024-01-03' },
    ];

    it('should return items without next cursor when no more items', () => {
      const result = createPaginationResponse(
        sampleItems,
        10, // limit > items.length
        'created_at',
        'desc',
        null
      );

      expect(result.items).toHaveLength(3);
      expect(result.pagination.has_more).toBe(false);
      expect(result.pagination.next_cursor).toBe(null);
    });

    it('should return next cursor when more items exist', () => {
      const result = createPaginationResponse(
        sampleItems,
        2, // limit < items.length
        'created_at',
        'desc',
        null
      );

      expect(result.items).toHaveLength(2);
      expect(result.pagination.has_more).toBe(true);
      expect(result.pagination.next_cursor).not.toBe(null);
    });

    it('should trim items to limit', () => {
      const items = [...sampleItems, { id: '4', name: 'Item 4', created_at: '2024-01-04' }];
      const result = createPaginationResponse(items, 3, 'created_at', 'desc', null);

      expect(result.items).toHaveLength(3);
      expect(result.items.map(i => i.id)).toEqual(['1', '2', '3']);
    });

    it('should include current cursor in pagination', () => {
      const currentCursor = 'test-cursor-123';
      const result = createPaginationResponse(sampleItems, 10, 'created_at', 'desc', currentCursor);

      expect(result.pagination.cursor).toBe(currentCursor);
    });

    it('should include limit in pagination', () => {
      const result = createPaginationResponse(sampleItems, 25, 'created_at', 'desc', null);
      expect(result.pagination.limit).toBe(25);
    });

    it('should handle empty items array', () => {
      const result = createPaginationResponse([], 10, 'created_at', 'desc', null);

      expect(result.items).toHaveLength(0);
      expect(result.pagination.has_more).toBe(false);
      expect(result.pagination.next_cursor).toBe(null);
    });

    it('should create valid next cursor that can be decoded', () => {
      const items = [...sampleItems, { id: '4', name: 'Extra', created_at: '2024-01-04' }];
      const result = createPaginationResponse(items, 3, 'created_at', 'desc', null);

      const decoded = decodeCursor(result.pagination.next_cursor!);
      expect(decoded).not.toBe(null);
      expect(decoded?.field).toBe('created_at');
      expect(decoded?.id).toBe('3');
      expect(decoded?.direction).toBe('desc');
    });

    it('should use correct order field value in cursor', () => {
      const items = [
        { id: '1', name: 'Alpha', created_at: '2024-01-01' },
        { id: '2', name: 'Beta', created_at: '2024-01-02' },
        { id: '3', name: 'Extra', created_at: '2024-01-03' },
      ];
      const result = createPaginationResponse(items, 2, 'name', 'asc', null);

      const decoded = decodeCursor(result.pagination.next_cursor!);
      expect(decoded?.value).toBe('Beta');
    });
  });

  describe('constants', () => {
    it('should have reasonable DEFAULT_LIMIT', () => {
      expect(DEFAULT_LIMIT).toBeGreaterThan(0);
      expect(DEFAULT_LIMIT).toBeLessThanOrEqual(50);
    });

    it('should have MAX_LIMIT greater than DEFAULT_LIMIT', () => {
      expect(MAX_LIMIT).toBeGreaterThan(DEFAULT_LIMIT);
    });

    it('should have MAX_LIMIT at 100', () => {
      expect(MAX_LIMIT).toBe(100);
    });
  });

  describe('applyCursorToQuery', () => {
    // Mock query builder
    const createMockQuery = () => ({
      or: vi.fn().mockReturnThis(),
    });

    it('should return query unchanged when no cursor', () => {
      const query = createMockQuery();
      const result = applyCursorToQuery(query, null, 'created_at', 'desc');

      expect(result).toBe(query);
      expect(query.or).not.toHaveBeenCalled();
    });

    it('should return query unchanged for invalid cursor', () => {
      const query = createMockQuery();
      const result = applyCursorToQuery(query, 'invalid-cursor', 'created_at', 'desc');

      expect(result).toBe(query);
      expect(query.or).not.toHaveBeenCalled();
    });

    it('should return query unchanged when cursor field does not match', () => {
      const query = createMockQuery();
      const cursor = encodeCursor({
        field: 'name',
        value: 'test',
        id: '123',
        direction: 'desc',
      });
      const result = applyCursorToQuery(query, cursor, 'created_at', 'desc');

      expect(result).toBe(query);
      expect(query.or).not.toHaveBeenCalled();
    });

    it('should return query unchanged when cursor direction does not match', () => {
      const query = createMockQuery();
      const cursor = encodeCursor({
        field: 'created_at',
        value: '2024-01-01',
        id: '123',
        direction: 'asc',
      });
      const result = applyCursorToQuery(query, cursor, 'created_at', 'desc');

      expect(result).toBe(query);
      expect(query.or).not.toHaveBeenCalled();
    });

    it('should apply desc cursor filter correctly', () => {
      const query = createMockQuery();
      const cursor = encodeCursor({
        field: 'created_at',
        value: '2024-01-15',
        id: 'uuid-123',
        direction: 'desc',
      });
      const result = applyCursorToQuery(query, cursor, 'created_at', 'desc');

      expect(result).toBe(query);
      expect(query.or).toHaveBeenCalledWith(
        'created_at.lt.2024-01-15,and(created_at.eq.2024-01-15,id.lt.uuid-123)'
      );
    });

    it('should apply asc cursor filter correctly', () => {
      const query = createMockQuery();
      const cursor = encodeCursor({
        field: 'name',
        value: 'Product A',
        id: 'uuid-456',
        direction: 'asc',
      });
      const result = applyCursorToQuery(query, cursor, 'name', 'asc');

      expect(result).toBe(query);
      expect(query.or).toHaveBeenCalledWith(
        'name.gt.Product A,and(name.eq.Product A,id.gt.uuid-456)'
      );
    });
  });
});
