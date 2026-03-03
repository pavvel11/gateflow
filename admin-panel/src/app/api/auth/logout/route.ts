// app/api/auth/logout/route.ts
// Logout endpoint — POST only (GET removed to prevent logout CSRF via link/image injection)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSafeRedirectUrl } from '@/lib/validations/redirect';

/**
 * Validate return URL using the shared isSafeRedirectUrl function.
 * Returns '/' as safe default if URL is invalid.
 */
function validateReturnUrl(url: string | null): string {
  if (!url) return '/';
  const decoded = decodeURIComponent(url).trim();
  return isSafeRedirectUrl(decoded) ? decoded : '/';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json().catch(() => ({}));
    const returnUrl = validateReturnUrl(body.returnUrl);

    // Best-effort server-side session revocation.
    // Always redirect even on error — the JWT will expire naturally (≤1h),
    // and failing to revoke server-side is an extreme edge case on self-hosted.
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[logout] signOut error (best-effort, continuing):', error);
    }

    return NextResponse.json({ success: true, redirectUrl: returnUrl });

  } catch (error) {
    console.error('[logout] unexpected error:', error);
    return NextResponse.json({ success: true, redirectUrl: '/' });
  }
}
