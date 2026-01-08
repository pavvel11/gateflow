import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { checkRateLimit } from '@/lib/rate-limiting';

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
 * Endpoint to serve the product page (index.html) with dynamic configuration
 * 
 * This endpoint reads the index.html file from the root directory and injects
 * the Supabase configuration before serving it to the client.
 */
export async function GET(request: Request) {
  try {
    // Rate limiting: 60 requests per minute
    const rateLimitOk = await checkRateLimit('product_page', 60, 60);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get origin from request headers for proper CORS support
    const origin = request.headers.get('origin') || '*';

    // Read the original index.html file
    const indexPath = join(process.cwd(), '../index.html')
    let indexContent = readFileSync(indexPath, 'utf-8')

    // Extract configuration from environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

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

    // Replace the script that loads config.js with an inline script
    // that directly sets the Supabase URL and key
    indexContent = indexContent.replace(
      /<script src="config.js"><\/script>/,
      `<script>
        // Dynamic configuration injected by GateFlow Admin Panel
        // Generated: ${new Date().toISOString()}
        
        const SUPABASE_URL = '${supabaseUrl}';
        const SUPABASE_ANON_KEY = '${supabaseAnonKey}';
        
        // Initialize Supabase client
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      </script>`
    )
    
    // Add admin panel branding comment at the start of <head>
    indexContent = indexContent.replace(
      '<head>',
      `<head>
    <!-- Product page served by GateFlow Admin Panel -->
    <!-- Generated: ${new Date().toISOString()} -->
    <!-- Environment: ${process.env.NODE_ENV} -->`
    )

    return new NextResponse(indexContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400', // 24 hours
      },
    })
  } catch (error) {
    console.error('Error serving product page:', error)
    const errorOrigin = request.headers.get('origin') || '*';
    
    return NextResponse.json(
      { error: 'Failed to serve product page' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': errorOrigin,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )
  }
}
