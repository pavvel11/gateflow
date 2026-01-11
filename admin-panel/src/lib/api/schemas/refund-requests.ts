/**
 * Refund Request schemas for API v1
 */

import { z } from 'zod';
import {
  UuidSchema,
  EmailSchema,
  CurrencySchema,
  DateTimeSchema,
  PaginationQuerySchema,
} from './common';

// ============================================================================
// Refund Request Status
// ============================================================================

export const RefundRequestStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
]).openapi('RefundRequestStatus');

export type RefundRequestStatus = z.infer<typeof RefundRequestStatusSchema>;

// ============================================================================
// Refund Request Schema
// ============================================================================

export const RefundRequestProductSchema = z.object({
  id: UuidSchema,
  name: z.string().openapi({ example: 'Premium Course' }),
  slug: z.string().openapi({ example: 'premium-course' }),
  price: z.number().optional().openapi({ example: 99.00 }),
  currency: CurrencySchema.optional(),
}).openapi('RefundRequestProduct');

export const RefundRequestTransactionSchema = z.object({
  id: UuidSchema,
  customer_email: EmailSchema,
  amount: z.number().openapi({ example: 99.00 }),
  currency: CurrencySchema,
  status: z.string().optional().openapi({ example: 'completed' }),
  stripe_payment_intent_id: z.string().nullable().optional(),
  created_at: DateTimeSchema,
}).openapi('RefundRequestTransaction');

export const RefundRequestSchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema.nullable(),
  product_id: UuidSchema,
  transaction_id: UuidSchema,
  customer_email: EmailSchema,
  requested_amount: z.number().openapi({ example: 99.00 }),
  currency: CurrencySchema,
  reason: z.string().nullable().openapi({ example: 'Product did not meet expectations' }),
  status: RefundRequestStatusSchema,
  admin_id: UuidSchema.nullable().optional(),
  admin_response: z.string().nullable().openapi({ example: 'Refund approved as per policy' }),
  processed_at: DateTimeSchema.nullable(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
  product: RefundRequestProductSchema.nullable().optional(),
  transaction: RefundRequestTransactionSchema.nullable().optional(),
}).openapi('RefundRequest');

export type RefundRequest = z.infer<typeof RefundRequestSchema>;

// ============================================================================
// List Refund Requests Query
// ============================================================================

export const ListRefundRequestsQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(['all', 'pending', 'approved', 'rejected']).default('all'),
  user_id: UuidSchema.optional(),
  product_id: UuidSchema.optional(),
}).openapi('ListRefundRequestsQuery');

export type ListRefundRequestsQuery = z.infer<typeof ListRefundRequestsQuerySchema>;

// ============================================================================
// Process Refund Request
// ============================================================================

export const ProcessRefundRequestSchema = z.object({
  action: z.enum(['approve', 'reject']).openapi({
    description: 'Action to take on the refund request',
  }),
  admin_response: z.string().max(500).optional().openapi({
    description: 'Response message to the customer',
    example: 'Your refund has been approved and will be processed within 5-10 business days.',
  }),
}).openapi('ProcessRefundRequest');

export type ProcessRefundRequestInput = z.infer<typeof ProcessRefundRequestSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const RefundRequestResponseSchema = z.object({
  success: z.literal(true),
  data: RefundRequestSchema,
}).openapi('RefundRequestResponse');

export const RefundRequestListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(RefundRequestSchema),
  pagination: z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  }),
}).openapi('RefundRequestListResponse');

export const ProcessRefundResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: UuidSchema,
    status: RefundRequestStatusSchema,
    message: z.string().openapi({ example: 'Refund processed successfully' }),
    stripe_refund_created: z.boolean().optional(),
  }),
}).openapi('ProcessRefundResponse');
