/**
 * Common schemas used across all API endpoints
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z);

// ============================================================================
// Pagination
// ============================================================================

export const PaginationQuerySchema = z.object({
  cursor: z.string().optional().openapi({
    description: 'Pagination cursor from previous response',
    example: 'eyJpZCI6IjEyMyJ9',
  }),
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: 'Number of items per page',
    example: 20,
  }),
});

export const PaginationMetaSchema = z.object({
  has_more: z.boolean().openapi({
    description: 'Whether there are more items available',
    example: true,
  }),
  next_cursor: z.string().nullable().openapi({
    description: 'Cursor for the next page',
    example: 'eyJpZCI6IjQ1NiJ9',
  }),
  total: z.number().optional().openapi({
    description: 'Total count of items (optional)',
    example: 150,
  }),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

// ============================================================================
// API Response Wrappers
// ============================================================================

export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(dataSchema),
    pagination: PaginationMetaSchema,
  });

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
    message: z.string().openapi({ example: 'Invalid input data' }),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
}).openapi('ErrorResponse');

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// Common Field Schemas
// ============================================================================

export const UuidSchema = z.string().uuid().openapi({
  description: 'UUID v4 identifier',
  example: '550e8400-e29b-41d4-a716-446655440000',
});

export const SlugSchema = z.string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
  .openapi({
    description: 'URL-friendly identifier',
    example: 'my-product-name',
  });

export const EmailSchema = z.string().email().openapi({
  description: 'Email address',
  example: 'user@example.com',
});

export const CurrencySchema = z.enum(['PLN', 'USD', 'EUR', 'GBP']).openapi({
  description: 'Currency code (ISO 4217)',
  example: 'PLN',
});

export const PriceSchema = z.number().min(0).openapi({
  description: 'Price in smallest currency unit (e.g., cents/grosze)',
  example: 9900,
});

export const DateTimeSchema = z.string().datetime().openapi({
  description: 'ISO 8601 datetime',
  example: '2024-01-15T10:30:00Z',
});

export const SortOrderSchema = z.enum(['asc', 'desc']).default('desc').openapi({
  description: 'Sort direction',
  example: 'desc',
});

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Parse and validate request body with Zod schema
 * Throws ApiValidationError on failure
 */
export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);
    throw new ValidationError(errors.join(', '));
  }
  return result.data;
}

/**
 * Parse query parameters with Zod schema
 */
export function parseQuery<T extends z.ZodTypeAny>(
  schema: T,
  searchParams: URLSearchParams
): z.infer<T> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return parseBody(schema, params);
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
