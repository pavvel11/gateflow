import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/**
 * Get a unique identifier for rate limiting
 * Uses user ID if authenticated, otherwise uses IP address
 */
export async function getRateLimitIdentifier(userId?: string): Promise<string> {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Get real IP address from headers
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const remoteAddress = headersList.get('x-remote-address');
  
  // Try to get IP from various headers (for different proxy setups)
  const ip = forwarded?.split(',')[0] || realIp || remoteAddress || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Check if action is rate limited
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
  const supabase = await createClient();
  const identifier = await getRateLimitIdentifier(userId);
  
  try {
    const { data: rateLimitOk, error } = await supabase.rpc('check_application_rate_limit', {
      identifier_param: identifier,
      action_type_param: actionType,
      max_requests: maxRequests,
      window_minutes: windowMinutes,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // In case of error, allow the action (fail open)
      return true;
    }

    return !!rateLimitOk;
  } catch (error) {
    console.error('Rate limit check exception:', error);
    // In case of error, allow the action (fail open)
    return true;
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
    maxRequests: 10, // Higher limit for anonymous users per IP
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
