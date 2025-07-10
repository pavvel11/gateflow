import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

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
  
  // If no code is provided, redirect to login
  if (!code) {
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }
  
  // Check for custom redirect URL (for product access etc.)
  let redirectPath = '/dashboard';
  const redirectTo = requestUrl.searchParams.get('redirect_to');
  
  if (redirectTo) {
    try {
      // Ensure the redirectTo is a valid URL path on our site (security)
      const redirectToUrl = new URL(redirectTo, requestUrl.origin);
      if (redirectToUrl.origin === requestUrl.origin) {
        redirectPath = redirectToUrl.pathname + redirectToUrl.search;
      }
    } catch {
      console.error('Invalid redirect URL:', redirectTo);
    }
  }
  
  // Use the request origin for redirects (works in any environment)
  const redirectUrl = new URL(redirectPath, requestUrl.origin)
  const response = NextResponse.redirect(redirectUrl)
  
  // Create server client to exchange the code for a session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              ...options
            })
          })
        },
      },
    }
  )
  
  // Exchange the code for a session
  // This automatically updates the session cookies
  await supabase.auth.exchangeCodeForSession(code)
  
  // Return the response with the updated cookies and redirect
  return response
}