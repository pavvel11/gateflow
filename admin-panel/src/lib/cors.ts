/**
 * CORS utilities for GateFlow API endpoints
 *
 * SECURITY: Only specific endpoints should allow cross-origin requests with credentials.
 * These are READ-ONLY endpoints that return non-sensitive data (access: true/false).
 */

import { NextResponse } from 'next/server'

/**
 * Endpoints that are allowed to be called cross-origin with credentials.
 * These MUST be read-only and return only non-sensitive data.
 */
export const CROSS_ORIGIN_ALLOWED_PATHS = [
  '/api/access',      // Returns only true/false for product access (reads user from cookies)
  '/api/gatekeeper',  // Serves the JS script (public, no auth needed)
]

/**
 * Validate that a request has proper security headers for cross-origin access.
 * Returns an error response if validation fails, null if valid.
 */
export function validateCrossOriginRequest(request: Request): NextResponse | null {
  const requestedWith = request.headers.get('X-Requested-With')
  const origin = request.headers.get('origin')

  // Require X-Requested-With header to prevent simple CSRF attacks
  if (requestedWith !== 'XMLHttpRequest') {
    return NextResponse.json(
      {
        error: 'Forbidden',
        message: 'Missing or invalid X-Requested-With header. This endpoint requires XMLHttpRequest.'
      },
      {
        status: 403,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    )
  }

  return null // Valid request
}

/**
 * Get CORS headers for cross-origin access endpoints.
 * Only use this for endpoints in CROSS_ORIGIN_ALLOWED_PATHS.
 */
export function getCrossOriginHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '*'

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-GateFlow-Origin, X-GateFlow-Version',
    'Access-Control-Max-Age': '86400',
  }
}

/**
 * Get restrictive CORS headers for admin/internal endpoints.
 * Does NOT allow credentials from cross-origin requests.
 */
export function getRestrictiveHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*', // Allow preflight but no credentials
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    // NO Access-Control-Allow-Credentials - this prevents cross-origin cookie sending
  }
}

/**
 * Create OPTIONS response for cross-origin endpoints.
 */
export function createCrossOriginOptionsResponse(request: Request): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: getCrossOriginHeaders(request),
  })
}
