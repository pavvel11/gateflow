import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate Limiting with automatic backend selection
 *
 * Backend priority:
 * 1. Upstash Redis (if UPSTASH_REDIS_REST_URL is set) - fastest, ~1-5ms
 * 2. Supabase Database RPC (fallback) - slower, ~10-50ms
 *
 * To enable Upstash, add env vars:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

// Lazy-loaded Upstash client
let upstashRatelimit: { ratelimiters: Map<string, Ratelimit>; redis: Redis } | null = null;

function getUpstashClient() {
  if (upstashRatelimit) return upstashRatelimit;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  upstashRatelimit = {
    redis: Redis.fromEnv(),
    ratelimiters: new Map(),
  };

  return upstashRatelimit;
}

/**
 * Get a unique identifier for rate limiting
 */
export async function getRateLimitIdentifier(userId?: string): Promise<string> {
  if (userId) {
    return `user:${userId}`;
  }

  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';

  return `ip:${ip}`;
}

/**
 * Check rate limit using Upstash Redis
 */
async function checkRateLimitUpstash(
  actionType: string,
  maxRequests: number,
  windowMinutes: number,
  identifier: string
): Promise<boolean> {
  const upstash = getUpstashClient();
  if (!upstash) return true;

  const key = `${actionType}:${maxRequests}:${windowMinutes}`;

  if (!upstash.ratelimiters.has(key)) {
    upstash.ratelimiters.set(key, new Ratelimit({
      redis: upstash.redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMinutes} m`),
      prefix: `ratelimit:${actionType}`,
    }));
  }

  const { success } = await upstash.ratelimiters.get(key)!.limit(identifier);
  return success;
}

/**
 * Check rate limit using Supabase Database
 */
async function checkRateLimitDatabase(
  actionType: string,
  maxRequests: number,
  windowMinutes: number,
  identifier: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data: rateLimitOk, error } = await supabase.rpc('check_application_rate_limit', {
    identifier_param: identifier,
    action_type_param: actionType,
    max_requests: maxRequests,
    window_minutes: windowMinutes,
  });

  if (error) {
    console.error('Rate limit check error:', error);
    return true; // Fail open
  }

  return !!rateLimitOk;
}

/**
 * Check if action is rate limited
 *
 * @param actionType - Type of action being performed
 * @param maxRequests - Maximum requests allowed
 * @param windowMinutes - Time window in minutes
 * @param userId - Optional user ID (if authenticated)
 * @returns Promise<boolean> - true if allowed, false if rate limited
 */
export async function checkRateLimit(
  actionType: string,
  maxRequests: number,
  windowMinutes: number,
  userId?: string
): Promise<boolean> {
  // Skip rate limiting in development and test mode
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return true;
  }

  const identifier = await getRateLimitIdentifier(userId);

  try {
    // Use Upstash if configured
    if (getUpstashClient()) {
      return await checkRateLimitUpstash(actionType, maxRequests, windowMinutes, identifier);
    }

    // Fallback to database
    return await checkRateLimitDatabase(actionType, maxRequests, windowMinutes, identifier);
  } catch (error) {
    console.error('Rate limit check exception:', error);
    return true; // Fail open
  }
}

/**
 * Standard rate limiting configurations
 */
export const RATE_LIMITS = {
  CHECKOUT_CREATION: {
    maxRequests: 5,
    windowMinutes: 15,
    actionType: 'checkout_creation',
  },
  CHECKOUT_CREATION_ANONYMOUS: {
    maxRequests: 10,
    windowMinutes: 15,
    actionType: 'checkout_creation',
  },
  EMAIL_VERIFICATION: {
    maxRequests: 3,
    windowMinutes: 60,
    actionType: 'email_verification',
  },
  PASSWORD_RESET: {
    maxRequests: 3,
    windowMinutes: 60,
    actionType: 'password_reset',
  },
} as const;
