// app/api/auth/logout/route.ts
// Logout endpoint with return URL support

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * SECURITY FIX (V6): Validate return URL to prevent open redirect attacks.
 * Only allows relative paths starting with / (not //).
 * Rejects: external URLs, protocol-relative URLs (//evil.com), javascript: URLs
 */
function validateReturnUrl(url: string | null): string {
  if (!url) return '/';

  // Trim and decode the URL
  const decoded = decodeURIComponent(url).trim();

  // Must start with exactly one / (not //)
  if (!decoded.startsWith('/') || decoded.startsWith('//')) {
    return '/';
  }

  // Reject javascript:, data:, vbscript: URLs (case insensitive)
  const lowerDecoded = decoded.toLowerCase();
  if (lowerDecoded.includes('javascript:') ||
      lowerDecoded.includes('data:') ||
      lowerDecoded.includes('vbscript:')) {
    return '/';
  }

  // Reject URLs with protocol indicators
  if (decoded.includes('://')) {
    return '/';
  }

  return decoded;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get return URL from request body and validate it
    const body = await request.json().catch(() => ({}));
    const returnUrl = validateReturnUrl(body.returnUrl);
    
    // Sign out the user
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
      return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      redirectUrl: returnUrl 
    });
    
  } catch (error) {
    console.error('Logout processing error:', error);
    return NextResponse.json({ error: 'Logout processing failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const returnUrl = validateReturnUrl(searchParams.get('returnUrl'));
    
    // Sign out the user
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
      return NextResponse.redirect(new URL('/?error=logout_failed', request.url));
    }
    
    // Redirect to return URL
    return NextResponse.redirect(new URL(returnUrl, request.url));
    
  } catch (error) {
    console.error('Logout processing error:', error);
    return NextResponse.redirect(new URL('/?error=logout_failed', request.url));
  }
}
