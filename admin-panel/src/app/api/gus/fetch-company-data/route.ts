import { NextRequest, NextResponse } from 'next/server';
import { validateNIPChecksum, normalizeNIP } from '@/lib/validation/nip';
import { GUSAPIClient } from '@/lib/services/gus-api-client';
import { getDecryptedGUSAPIKey } from '@/lib/actions/gus-config';
import { rateLimit, getClientIdentifier, createRateLimitHeaders } from '@/lib/rate-limit';

/**
 * POST /api/gus/fetch-company-data
 *
 * Fetches company data from GUS REGON API based on NIP (Polish tax ID).
 *
 * SECURITY:
 * - CORS protection: only same-origin requests allowed
 * - CSRF protection: origin/referer validation
 * - Rate limiting: 5 requests per minute per IP
 * - NIP validation before API call
 *
 * Request body:
 * {
 *   "nip": "1234567890"  // 10-digit NIP, with or without dashes
 * }
 *
 * Response (success):
 * {
 *   "success": true,
 *   "data": {
 *     "nazwa": "PRZYKŁADOWA SPÓŁKA Z O.O.",
 *     "ulica": "ul. Testowa",
 *     "nrNieruchomosci": "1",
 *     "nrLokalu": "2",
 *     "miejscowosc": "Warszawa",
 *     "kodPocztowy": "00-001",
 *     "wojewodztwo": "MAZOWIECKIE",
 *     "regon": "123456789",
 *     "nip": "1234567890"
 *   }
 * }
 *
 * Response (error):
 * {
 *   "success": false,
 *   "error": "Error message",
 *   "code": "ERROR_CODE"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. CORS Protection - Only allow same-origin requests
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    // Check if request is from same origin
    const allowedOrigins = [
      `https://${host}`,
      `http://${host}`,
      process.env.NEXT_PUBLIC_SITE_URL,
    ].filter(Boolean);

    const isValidOrigin = origin && allowedOrigins.some(allowed =>
      origin === allowed || (allowed ? origin.startsWith(allowed) : false)
    );

    const isValidReferer = referer && allowedOrigins.some(allowed =>
      allowed ? referer.startsWith(allowed) : false
    );

    if (!isValidOrigin && !isValidReferer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Invalid origin',
          code: 'INVALID_ORIGIN'
        },
        {
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': 'null', // Explicitly deny
          }
        }
      );
    }

    // 2. Rate Limiting - 5 requests per minute per IP
    const clientId = getClientIdentifier(request);
    const rateLimitResult = rateLimit(`gus:${clientId}`, {
      maxRequests: 5,
      windowMs: 60 * 1000, // 1 minute
    });

    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders,
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    // 3. Parse and validate request
    const { nip } = await request.json();

    // Validate NIP is provided
    if (!nip) {
      return NextResponse.json(
        {
          success: false,
          error: 'NIP is required',
          code: 'MISSING_NIP'
        },
        {
          status: 400,
          headers: rateLimitHeaders
        }
      );
    }

    // Normalize and validate NIP checksum
    const normalizedNIP = normalizeNIP(nip);

    if (!validateNIPChecksum(normalizedNIP)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid NIP checksum. Please verify the number.',
          code: 'INVALID_NIP'
        },
        {
          status: 400,
          headers: rateLimitHeaders
        }
      );
    }

    // Get API key from configuration
    const apiKey = await getDecryptedGUSAPIKey();

    if (!apiKey) {
      // GUS API not configured - return error
      // In production, this should be configured by admin
      return NextResponse.json(
        {
          success: false,
          error: 'GUS API is not configured. Please contact administrator.',
          code: 'NOT_CONFIGURED'
        },
        {
          status: 503,
          headers: rateLimitHeaders
        }
      );
    }

    // Create GUS client and fetch company data
    const client = new GUSAPIClient(apiKey);
    const companyData = await client.searchByNIP(normalizedNIP);

    if (!companyData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company not found in GUS database',
          code: 'NOT_FOUND'
        },
        {
          status: 404,
          headers: rateLimitHeaders
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: companyData
      },
      {
        headers: rateLimitHeaders
      }
    );

  } catch (error: any) {
    console.error('Error fetching GUS data:', error);

    // Handle specific errors
    if (error.message?.includes('timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: 'GUS API request timeout. Please try again.',
          code: 'TIMEOUT'
        },
        { status: 504 }
      );
    }

    if (error.message?.includes('authentication') || error.message?.includes('session')) {
      return NextResponse.json(
        {
          success: false,
          error: 'GUS API authentication failed. Please contact administrator.',
          code: 'AUTH_FAILED'
        },
        { status: 500 }
      );
    }

    if (error.message?.includes('network')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Network error connecting to GUS API. Please try again.',
          code: 'NETWORK_ERROR'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch company data',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle OPTIONS request for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // Only allow same-origin
  const allowedOrigins = [
    `https://${host}`,
    `http://${host}`,
    process.env.NEXT_PUBLIC_SITE_URL,
  ].filter(Boolean);

  const isValidOrigin = origin && allowedOrigins.some(allowed =>
    origin === allowed || (allowed ? origin.startsWith(allowed) : false)
  );

  if (!isValidOrigin) {
    return new NextResponse(null, {
      status: 403,
      headers: {
        'Access-Control-Allow-Origin': 'null',
      }
    });
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    }
  });
}
