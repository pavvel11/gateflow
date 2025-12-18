import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Session, AuthError } from '@supabase/supabase-js'
import { DisposableEmailService } from '@/lib/services/disposable-email'

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
  
  // Get the correct origin for redirects - prioritize env var, then headers, then request URL
  const getOrigin = () => {
    // First try environment variable
    if (process.env.SITE_URL) {
      return process.env.SITE_URL
    }
    
    // Then try headers (for production environments)
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 
                    request.headers.get('x-forwarded-protocol') ||
                    (requestUrl.protocol === 'https:' ? 'https' : 'http')
    
    if (host) {
      return `${protocol}://${host}`
    }
    
    // Fallback to request URL origin
    return requestUrl.origin
  }
  
  const origin = getOrigin()

  // Check if we have code parameter
  if (!code) {
    return NextResponse.redirect(new URL('/login', origin))
  }
  
  // Create server client to exchange the code for a session first
  // We need a temporary response to collect cookies during auth process
  const tempResponse = NextResponse.next()
  
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
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
    // Try OAuth code exchange first (standard PKCE flow for magic links and OAuth)
    const oauthResponse = await supabase.auth.exchangeCodeForSession(code);
    
    if (oauthResponse.data.session) {
      session = oauthResponse.data.session;
      error = oauthResponse.error;
    } else {
      // If code exchange fails, try verifyOtp (legacy/implicit flow or direct token)
      // Note: In PKCE flow, 'code' is an auth code, not a token hash.
      const otpResponse = await supabase.auth.verifyOtp({
        token_hash: code,
        type: 'magiclink'
      });
      session = otpResponse.data.session;
      error = otpResponse.error;
    }
  }
  
  
  if (error || !session) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  // Validate email for disposable domains (security check)
  const userEmail = session.user?.email;
  if (userEmail) {
    try {
      const emailValidation = await DisposableEmailService.validateEmail(userEmail);
      if (!emailValidation.isValid) {
        // Sign out the user immediately
        await supabase.auth.signOut();
        
        // Redirect to login with error
        const loginUrl = new URL('/login', origin);
        loginUrl.searchParams.set('error', 'disposable_email');
        return NextResponse.redirect(loginUrl);
      }
    } catch (error) {
      console.error('Email validation error in auth callback:', error);
      // Don't block auth on validation service errors, just log
    }
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
        if (redirectToUrl.origin === origin) {
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
  
  // Use the correct origin for redirects
  const redirectUrl = new URL(redirectPath, origin)
  
  // Create redirect response and transfer auth cookies
  const redirectResponse = NextResponse.redirect(redirectUrl)
  
  // Transfer cookies from the temp response to the redirect response
  tempResponse.cookies.getAll().forEach(cookie => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  
  return redirectResponse
}