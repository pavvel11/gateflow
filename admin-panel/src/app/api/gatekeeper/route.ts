import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

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
    // Read the original gatekeeper.js file
    const gatekeeperPath = join(process.cwd(), '../gatekeeper.js')
    const gatekeeperContent = readFileSync(gatekeeperPath, 'utf-8')

    // Extract configuration from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Get the origin from the request headers or default to '*'
    const origin = request.headers.get('origin') || '*';

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

    // Replace the hardcoded configuration with dynamic values
    const modifiedContent = gatekeeperContent
      .replace(
        /const SUPABASE_URL = '.*?';/,
        `const SUPABASE_URL = '${supabaseUrl}';`
      )
      .replace(
        /const SUPABASE_ANON_KEY = '.*?';/,
        `const SUPABASE_ANON_KEY = '${supabaseAnonKey}';`
      )

    // Add admin panel branding comment
    const finalContent = `// GateKeeper.js - Served by GateFlow Admin Panel
// Generated: ${new Date().toISOString()}
// Configuration: Dynamic (${process.env.NODE_ENV})
// Version: ${process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}

${modifiedContent}`

    return new NextResponse(finalContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400', // 24 hours
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
