import { NextResponse } from 'next/server'
import { GatekeeperGenerator } from '@/lib/gatekeeper-generator'
import { createClient } from '@supabase/supabase-js'
import { MemoryCache, handleConditionalRequest, createScriptResponse } from '@/lib/script-cache'
import packageJson from '../../../../package.json'

/**
 * License cache using shared MemoryCache (5 min TTL)
 */
const licenseCache = new MemoryCache<boolean>({ ttl: 5 * 60 * 1000 });

/**
 * Get cached license validity or fetch from database
 */
async function getCachedLicenseValid(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<boolean> {
  const cacheKey = 'license_valid';

  // Check cache first
  const cached = licenseCache.get(cacheKey);
  if (cached) {
    return cached.data;
  }

  // Fetch from database
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: integrationsConfig } = await supabaseAdmin
      .from('integrations_config')
      .select('gateflow_license')
      .eq('id', 1)
      .single();

    const isValid = validateLicense(integrationsConfig?.gateflow_license || null);

    // Cache the result
    licenseCache.set(cacheKey, isValid);

    return isValid;
  } catch {
    // If DB read fails, return false
    return false;
  }
}

/**
 * Clear license cache (useful when license is updated via admin panel)
 */
export function clearLicenseCache(): void {
  licenseCache.clear();
}

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
 *
 * Performance optimizations:
 * - License check cached for 5 minutes (avoids DB query on every request)
 * - Script generation cached for 1 hour (in GatekeeperGenerator)
 * - HTTP caching with ETag support (304 Not Modified responses)
 * - Stale-while-revalidate for better UX
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
      clearLicenseCache();
    }

    // Get license validity from cache (5 min TTL) or fetch from database
    let licenseValid = false;
    if (supabaseServiceKey) {
      licenseValid = await getCachedLicenseValid(supabaseUrl, supabaseServiceKey);
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

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Check for conditional request (ETag/If-None-Match)
    const conditionalResponse = handleConditionalRequest(request, generatedResult.hash, corsHeaders);
    if (conditionalResponse) {
      return conditionalResponse;
    }

    return createScriptResponse(generatedResult.content, generatedResult.hash, {
      ...corsHeaders,
      'Last-Modified': generatedResult.lastModified.toUTCString(),
      'X-License-Cached': licenseCache.size > 0 ? 'true' : 'false',
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
