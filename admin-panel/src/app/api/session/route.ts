import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*';
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-GateFlow-Origin, X-GateFlow-Version',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Get current user session for cross-domain access
 */
export async function GET(request: Request) {
  try {
    const origin = request.headers.get('origin') || '*';
    
    // 🔐 Validate GateFlow security headers
    const requestedWith = request.headers.get('X-Requested-With');
    const gateflowOrigin = request.headers.get('X-GateFlow-Origin');
    const gateflowVersion = request.headers.get('X-GateFlow-Version');
    
    // CSRF protection check
    if (requestedWith !== 'XMLHttpRequest') {
      console.warn('⚠️ Missing X-Requested-With header from:', origin);
      // Log but don't block - for monitoring
    }
    
    // Log GateFlow request details
    logger.info('GateFlow session request:', {
      origin: gateflowOrigin,
      version: gateflowVersion,
      userAgent: request.headers.get('user-agent')?.slice(0, 100),
      timestamp: new Date().toISOString()
    });
    
    // Create Supabase client with server-side auth
    const supabase = await createClient()
    
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      logger.error('Session check error:', error.message);
      return NextResponse.json(
        { session: null, error: error.message },
        { 
          status: 200, // Return 200 even for auth errors
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      )
    }
    
    // Debug logging
    logger.debug('Cross-domain session check:', {
      hasSession: !!session,
      userEmail: session?.user?.email,
      origin: origin,
      userAgent: request.headers.get('user-agent')?.substring(0, 50) + '...'
    });
    
    return NextResponse.json(
      { session },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('Session API error:', error)
    
    const origin = request.headers.get('origin') || '*';
    
    return NextResponse.json(
      { session: null, error: 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )
  }
}
