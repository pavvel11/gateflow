import { NextRequest, NextResponse } from 'next/server';
import { DisposableEmailService } from '@/lib/services/disposable-email';

/**
 * Email Validation API Endpoint
 * 
 * Validates email addresses and checks for disposable domains
 * using server-side caching for optimal performance.
 * 
 * @route POST /api/validate-email
 */

// Response type definition
interface EmailValidationResponse {
  success: boolean;
  data?: {
    isValid: boolean;
    isDisposable: boolean;
    domain: string;
    error?: string;
  };
  error?: {
    message: string;
    code: string;
  };
  meta: {
    timestamp: string;
    processingTime: number;
    domainsLoaded: number;
  };
}

/**
 * Rate limiting using simple in-memory store
 * In production, consider using Redis or proper rate limiting service
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

function getRateLimitKey(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwardedFor?.split(',')[0] || realIp || 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  const entry = rateLimitMap.get(key);
  
  if (!entry || entry.resetTime < windowStart) {
    rateLimitMap.set(key, { count: 1, resetTime: now });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  entry.count++;
  return false;
}

function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest): Promise<NextResponse<EmailValidationResponse>> {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const clientKey = getRateLimitKey(request);
    if (isRateLimited(clientKey)) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          domainsLoaded: 0
        }
      }, { status: 429 });
    }

    // Parse and validate request body
    const body = await request.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Invalid JSON body',
          code: 'INVALID_JSON'
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          domainsLoaded: 0
        }
      }, { status: 400 });
    }

    // Validate email field
    const { email, allowDisposable = false } = body;
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Email is required and must be a string',
          code: 'VALIDATION_ERROR'
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          domainsLoaded: 0
        }
      }, { status: 400 });
    }

    if (!validateEmailFormat(email)) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Invalid email format',
          code: 'VALIDATION_ERROR'
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          domainsLoaded: 0
        }
      }, { status: 400 });
    }

    // Extract domain for response
    const domain = email.toLowerCase().split('@')[1];

    // Validate email using the disposable email service
    const result = await DisposableEmailService.validateEmail(email, allowDisposable);
    
    const response: EmailValidationResponse = {
      success: true,
      data: {
        isValid: result.isValid,
        isDisposable: result.isDisposable,
        domain,
        ...(result.error && { error: result.error })
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        domainsLoaded: DisposableEmailService.getDomainCount()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Email validation API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        domainsLoaded: 0
      }
    }, { status: 500 });
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return NextResponse.json({
    success: false,
    error: {
      message: 'Method not allowed. Use POST instead.',
      code: 'METHOD_NOT_ALLOWED'
    },
    meta: {
      timestamp: new Date().toISOString(),
      processingTime: 0,
      domainsLoaded: 0
    }
  }, { status: 405 });
}
