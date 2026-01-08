import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limiting';

/**
 * Runtime Configuration API
 * Provides client-side configuration loaded from environment variables
 * Cached for performance
 */
export async function GET() {
  // Rate limiting: 60 requests per minute
  const rateLimitOk = await checkRateLimit('runtime_config', 60, 60);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const config = {
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    cloudflareSiteKey: process.env.CLOUDFLARE_TURNSTILE_SITE_KEY!,
    siteUrl: process.env.SITE_URL!,
  }

  return NextResponse.json(config, {
    headers: {
      // Cache for 5 minutes
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      // Prevent caching during development
      ...(process.env.NODE_ENV === 'development' && {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      })
    }
  })
}
