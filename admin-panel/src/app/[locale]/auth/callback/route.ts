import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Session, AuthError } from '@supabase/supabase-js'

/**
 * Auth callback handler for Supabase magic links
 * 
 * This route handles the callback from Supabase auth when users click 
 * the magic link sent to their email. It exchanges the code for a session
 * and redirects the user to the dashboard.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  

  // Check if we have code parameter
  if (!code) {
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }
  
  // Create server client to exchange the code for a session first
  // We need a temporary response to collect cookies during auth process
  const tempResponse = NextResponse.next()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Set cookies on the temporary response object
          cookiesToSet.forEach(({ name, value, options }) => {
            tempResponse.cookies.set({
              name,
              value,
              ...options
            })
          })
        },
      },
    }
  )
  
  // Exchange the code for a session - different methods for different auth types
  let session: Session | null = null;
  let error: AuthError | null = null;
  
  if (code) {
    // For magic links, the code parameter is actually the token_hash
    // Try verifyOtp first (for magic links)
    const otpResponse = await supabase.auth.verifyOtp({
      token_hash: code,
      type: 'magiclink'
    });
    
    if (otpResponse.data.session) {
      session = otpResponse.data.session;
      error = otpResponse.error;
    } else {
      // If OTP verification fails, try OAuth code exchange
      const oauthResponse = await supabase.auth.exchangeCodeForSession(code);
      session = oauthResponse.data.session;
      error = oauthResponse.error;
    }
  }
  
  
  if (error || !session) {
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }

  // Note: Guest purchases are now automatically claimed by database trigger
  // when user registers/signs in for the first time
  
  // Check for custom redirect URL (for product access etc.)
  let redirectPath = '/dashboard' // default to dashboard
  const redirectTo = requestUrl.searchParams.get('redirect_to')
  
  if (redirectTo) {
    try {
      // Decode the redirect URL to handle encoded parameters
      const decodedRedirectTo = decodeURIComponent(redirectTo)
      
      // Check if it's a relative path (starts with /)
      if (decodedRedirectTo.startsWith('/')) {
        redirectPath = decodedRedirectTo
      } else {
        // If it's a full URL, validate it's on our domain
        const redirectToUrl = new URL(decodedRedirectTo)
        if (redirectToUrl.origin === requestUrl.origin) {
          redirectPath = redirectToUrl.pathname + redirectToUrl.search
        }
      }
    } catch {
      // Silent error handling - if decoding fails, fallback to default
    }
  } else {
    // No custom redirect, check user role to determine default redirect
    try {
      const { data: isAdmin } = await supabase.rpc('is_admin')
      
      if (isAdmin) {
        redirectPath = '/dashboard' // Admins go to dashboard
      } else {
        redirectPath = '/my-products' // Regular users go to their products
      }
    } catch {
      // If we can't determine admin status, send to user page as safer default
      redirectPath = '/my-products'
    }
  }
  
  // Use the request origin for redirects (works in any environment)
  const redirectUrl = new URL(redirectPath, requestUrl.origin)
  
  // Create redirect response and transfer auth cookies
  const redirectResponse = NextResponse.redirect(redirectUrl)
  
  // Transfer cookies from the temp response to the redirect response
  tempResponse.cookies.getAll().forEach(cookie => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  
  return redirectResponse
}