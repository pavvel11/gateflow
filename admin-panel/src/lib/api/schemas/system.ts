/**
 * System schemas for API v1
 */

import { z } from 'zod';
import { DateTimeSchema } from './common';

// ============================================================================
// System Status
// ============================================================================

export const SystemStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']).openapi({ example: 'healthy' }),
  timestamp: DateTimeSchema,
  version: z.object({
    api: z.string().openapi({ example: 'v1' }),
    service: z.string().openapi({ example: 'gateflow-admin' }),
    build: z.string().openapi({ example: 'abc1234' }),
  }),
  environment: z.string().openapi({ example: 'production' }),
  database: z.object({
    connected: z.boolean().openapi({ example: true }),
    error: z.string().nullable().openapi({ example: null }),
  }),
  counts: z.object({
    products: z.object({
      total: z.number().int().openapi({ example: 15 }),
      active: z.number().int().openapi({ example: 12 }),
    }),
    users: z.object({
      total: z.number().int().openapi({ example: 540 }),
    }),
    transactions: z.object({
      total: z.number().int().openapi({ example: 980 }),
      completed: z.number().int().openapi({ example: 920 }),
    }),
    refund_requests: z.object({
      pending: z.number().int().openapi({ example: 3 }),
    }),
    webhooks: z.object({
      active: z.number().int().openapi({ example: 5 }),
    }),
    coupons: z.object({
      active: z.number().int().openapi({ example: 8 }),
    }),
    api_keys: z.object({
      active: z.number().int().openapi({ example: 4 }),
    }),
  }),
  features: z.object({
    stripe_enabled: z.boolean().openapi({ example: true }),
    webhooks_enabled: z.boolean().openapi({ example: true }),
    api_keys_enabled: z.boolean().openapi({ example: true }),
  }),
}).openapi('SystemStatus');

export type SystemStatus = z.infer<typeof SystemStatusSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const SystemStatusResponseSchema = z.object({
  success: z.literal(true),
  data: SystemStatusSchema,
}).openapi('SystemStatusResponse');
