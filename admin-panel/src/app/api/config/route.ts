import { NextRequest, NextResponse } from 'next/server';
import { ConfigGenerator } from '@/lib/config-generator';
import { checkRateLimit } from '@/lib/rate-limiting';
import { handleConditionalRequest, createScriptResponse } from '@/lib/script-cache';

/**
 * Dynamic Config.js Generator API
 * Generates config.js with proper Supabase configuration
 * Used for custom login pages and integrations
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting: 60 requests per minute
    const rateLimitOk = await checkRateLimit('config_js', 60, 60);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get configuration from environment variables (runtime config)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        error: 'Supabase configuration missing',
        message: 'SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
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

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Check for conditional request (ETag/If-None-Match)
    const conditionalResponse = handleConditionalRequest(request, result.hash, corsHeaders);
    if (conditionalResponse) {
      return conditionalResponse;
    }

    // Return with proper headers
    return createScriptResponse(result.content, result.hash, {
      ...corsHeaders,
      'X-Generated-At': result.lastModified.toISOString(),
      'X-Environment': environment,
      'X-Format': format,
      'X-Config-Size': result.content.length.toString(),
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
