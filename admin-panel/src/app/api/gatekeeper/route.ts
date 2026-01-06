import { NextResponse } from 'next/server'
import { GatekeeperGenerator } from '@/lib/gatekeeper-generator'
import { createClient } from '@supabase/supabase-js'
import packageJson from '../../../../package.json'

/**
 * Validate license format and expiry (server-side)
 * Returns true if license is valid and not expired
 */
function validateLicense(licenseKey: string | null): boolean {
  if (!licenseKey) return false;

  // Parse license: GF-domain-YYYYMMDD-signature or GF-domain-UNLIMITED-signature
  const parts = licenseKey.split('-');
  if (parts.length < 4 || parts[0] !== 'GF') {
    return false;
  }

  const expiry = parts[2];

  // UNLIMITED license is always valid
  if (expiry === 'UNLIMITED') {
    return true;
  }

  // Check date format and expiry
  if (!/^\d{8}$/.test(expiry)) {
    return false;
  }

  // Parse YYYYMMDD
  const year = parseInt(expiry.substring(0, 4), 10);
  const month = parseInt(expiry.substring(4, 6), 10) - 1; // JS months are 0-indexed
  const day = parseInt(expiry.substring(6, 8), 10);
  const expiryDate = new Date(year, month, day, 23, 59, 59);

  return expiryDate >= new Date();
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: Request) {
  // Get the origin from the request headers or default to '*'
  const origin = request.headers.get('origin') || '*';
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}

/**
 * Serve the gatekeeper.js file with dynamic Supabase configuration
 */
export async function GET(request: Request) {
  try {
    // Extract configuration from environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Get the origin from the request headers or default to '*'
    const origin = request.headers.get('origin') || '*';

    // Check for cache clearing parameter
    const url = new URL(request.url);
    const clearCache = url.searchParams.get('clearCache') === 'true';

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration not found' },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      )
    }

    // Clear cache if requested
    if (clearCache) {
      GatekeeperGenerator.clearCache();
    }

    // Read license from database
    let licenseValid = false;
    if (supabaseServiceKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const { data: integrationsConfig } = await supabaseAdmin
          .from('integrations_config')
          .select('gateflow_license')
          .eq('id', 1)
          .single();

        licenseValid = validateLicense(integrationsConfig?.gateflow_license || null);
      } catch {
        // If DB read fails, default to showing watermark
        licenseValid = false;
      }
    }

    // Get productSlug from URL params for full page protection
    const productSlug = url.searchParams.get('productSlug');

    // Get main domain from environment or default to current host
    const mainDomain = process.env.MAIN_DOMAIN ||
                      (process.env.NODE_ENV === 'development' ? 'localhost:3000' : request.headers.get('host') || 'localhost:3000');

    // Generate the gatekeeper script using the new generator
    const config = {
      supabaseUrl,
      supabaseAnonKey,
      environment: process.env.NODE_ENV as 'development' | 'production' | 'test',
      version: packageJson.version,
      mainDomain,
      productSlug: productSlug || undefined,
      licenseValid,
      // Optional: Add any additional configuration
      cacheDuration: 3600, // 1 hour
      debugMode: process.env.NODE_ENV === 'development',
    };

    const generatedResult = await GatekeeperGenerator.generateScript(config);

    return new NextResponse(generatedResult.content, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400', // 24 hours
        'ETag': generatedResult.hash,
        'Last-Modified': generatedResult.lastModified.toUTCString(),
      },
    })
  } catch (error) {
    console.error('Error serving gatekeeper.js:', error)
    return NextResponse.json(
      { error: 'Failed to serve gatekeeper.js' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )
  }
}
