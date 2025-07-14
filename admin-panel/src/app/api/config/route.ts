import { NextRequest, NextResponse } from 'next/server';
import { ConfigGenerator } from '@/lib/config-generator';

/**
 * Dynamic Config.js Generator API
 * Generates config.js with proper Supabase configuration
 * Used for custom login pages and integrations
 */
export async function GET(request: NextRequest) {
  try {
    // Get configuration from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
    
    // Get optional parameters from query string
    const { searchParams } = new URL(request.url);
    const environment = process.env.NODE_ENV || 'production';
    const includeComments = searchParams.get('comments') !== 'false';
    const format = searchParams.get('format') === 'global' ? 'global' : 'module';
    const customDomain = searchParams.get('domain') || undefined;
    
    // Generate the config script using ConfigGenerator
    const result = await ConfigGenerator.generateConfig({
      supabaseUrl,
      supabaseAnonKey,
      environment,
      includeComments,
      format,
      customDomain
    });
    
    // Return with proper headers
    return new NextResponse(result.content, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=1800', // Cache for 30 minutes
        'X-Generated-At': result.lastModified.toISOString(),
        'X-Environment': environment,
        'X-Format': format,
        'X-Content-Hash': result.hash,
        'X-Config-Size': result.content.length.toString(),
        'Access-Control-Allow-Origin': '*', // Allow cross-origin requests
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Config generation error:', error);
    
    return NextResponse.json({
      error: 'Failed to generate config',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
