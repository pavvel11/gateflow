// app/api/auth/logout/route.ts
// Logout endpoint with return URL support

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get return URL from request body
    const body = await request.json().catch(() => ({}));
    const returnUrl = body.returnUrl || '/';
    
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
    const returnUrl = searchParams.get('returnUrl') || '/';
    
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
