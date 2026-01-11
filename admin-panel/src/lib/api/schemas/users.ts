/**
 * User schemas for API v1
 */

import { z } from 'zod';
import {
  UuidSchema,
  EmailSchema,
  DateTimeSchema,
  PaginationQuerySchema,
} from './common';

// ============================================================================
// User Access Schema
// ============================================================================

export const UserAccessSchema = z.object({
  id: UuidSchema,
  product_id: UuidSchema,
  product_name: z.string().openapi({ example: 'Premium Course' }),
  product_slug: z.string().openapi({ example: 'premium-course' }),
  granted_at: DateTimeSchema,
  expires_at: DateTimeSchema.nullable(),
  source: z.enum(['purchase', 'manual', 'coupon', 'free']).openapi({ example: 'purchase' }),
  is_active: z.boolean(),
}).openapi('UserAccess');

// ============================================================================
// User Schema
// ============================================================================

export const UserSchema = z.object({
  id: UuidSchema,
  email: EmailSchema,
  full_name: z.string().nullable().openapi({ example: 'John Doe' }),
  created_at: DateTimeSchema,
  last_sign_in_at: DateTimeSchema.nullable(),
  access: z.array(UserAccessSchema).optional(),
  purchase_count: z.number().int().optional().openapi({ example: 3 }),
  total_spent: z.number().optional().openapi({ example: 299.97 }),
}).openapi('User');

export type User = z.infer<typeof UserSchema>;

// ============================================================================
// List Users Query
// ============================================================================

export const ListUsersQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional().openapi({
    description: 'Search by email',
    example: 'john@example.com',
  }),
  has_access_to: UuidSchema.optional().openapi({
    description: 'Filter users with access to specific product',
  }),
}).openapi('ListUsersQuery');

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

// ============================================================================
// Grant Access
// ============================================================================

export const GrantAccessSchema = z.object({
  product_id: UuidSchema.openapi({
    description: 'Product to grant access to',
  }),
  expires_at: z.string().datetime().nullable().optional().openapi({
    description: 'When access expires (null = never)',
    example: '2025-12-31T23:59:59Z',
  }),
  source: z.enum(['manual', 'coupon', 'free']).default('manual').openapi({
    description: 'How access was granted',
  }),
  notify_user: z.boolean().default(false).openapi({
    description: 'Send email notification to user',
  }),
}).openapi('GrantAccessRequest');

export type GrantAccessInput = z.infer<typeof GrantAccessSchema>;

// ============================================================================
// Extend Access
// ============================================================================

export const ExtendAccessSchema = z.object({
  expires_at: z.string().datetime().nullable().openapi({
    description: 'New expiration date (null = never)',
    example: '2026-12-31T23:59:59Z',
  }),
}).openapi('ExtendAccessRequest');

export type ExtendAccessInput = z.infer<typeof ExtendAccessSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const UserResponseSchema = z.object({
  success: z.literal(true),
  data: UserSchema,
}).openapi('UserResponse');

export const UserListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(UserSchema),
  pagination: z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  }),
}).openapi('UserListResponse');
