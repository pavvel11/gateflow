// lib/security/rate-limit.ts
// Rate limiting utilities for API protection

import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export interface RateLimitOptions {
  maxRequests: number;
  windowMinutes: number;
  identifier?: string;
}

/**
 * Check if request is within rate limits
 */
export async function checkRateLimit(
  request: NextRequest,
  actionType: string,
  options: RateLimitOptions = { maxRequests: 10, windowMinutes: 60 }
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const supabase = await createClient();
  
  // Get identifier (IP address or user ID)
  const identifier = options.identifier || 
    request.headers.get('x-forwarded-for') || 
    request.headers.get('x-real-ip') || 
    'unknown';

  try {
    const { data: allowed, error } = await supabase.rpc('check_rate_limit', {
      identifier_param: identifier,
      action_type_param: actionType,
      max_requests: options.maxRequests,
      window_minutes: options.windowMinutes,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: options.maxRequests,
        resetTime: new Date(Date.now() + options.windowMinutes * 60 * 1000),
      };
    }

    // Calculate remaining requests and reset time
    const remaining = allowed ? options.maxRequests - 1 : 0;
    const resetTime = new Date(Date.now() + options.windowMinutes * 60 * 1000);

    return {
      allowed: Boolean(allowed),
      remaining,
      resetTime,
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open
    return {
      allowed: true,
      remaining: options.maxRequests,
      resetTime: new Date(Date.now() + options.windowMinutes * 60 * 1000),
    };
  }
}

/**
 * Get user identifier for rate limiting
 */
export async function getUserIdentifier(request: NextRequest): Promise<string> {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return `user:${user.id}`;
    }
  } catch {
    // User not authenticated
  }
  
  // Fall back to IP address
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         'unknown';
}
