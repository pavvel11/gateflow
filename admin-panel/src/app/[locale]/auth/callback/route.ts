import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { claimGuestPurchases } from '@/lib/actions/auth'

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
  
  // Exchange the code for a session first
  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
  
  if (error || !session) {
    console.error('Error exchanging code for session:', error)
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }

  // Claim any guest purchases for this user's email
  if (session?.user?.email && session?.user?.id) {
    try {
      const result = await claimGuestPurchases(session.user.email, session.user.id)
      if (result.success && result.claimedCount > 0) {
        console.log(`🎉 [AuthCallback] Claimed ${result.claimedCount} guest purchases for user ${session.user.email}`)
      }
    } catch (error) {
      console.error('Error claiming guest purchases:', error)
      // Don't block the login process if claiming fails
    }
  }
  
  // Check for custom redirect URL (for product access etc.)
  let redirectPath = '/dashboard' // default to dashboard
  const redirectTo = requestUrl.searchParams.get('redirect_to')
  
  if (redirectTo) {
    try {
      // Decode the redirect URL to handle encoded parameters
      const decodedRedirectTo = decodeURIComponent(redirectTo)
      
      console.log('🔍 [AuthCallback] Processing redirect:', {
        original: redirectTo,
        decoded: decodedRedirectTo,
        startsWithSlash: decodedRedirectTo.startsWith('/')
      })
      
      // Check if it's a relative path (starts with /)
      if (decodedRedirectTo.startsWith('/')) {
        redirectPath = decodedRedirectTo
        console.log('🔍 [AuthCallback] Using relative path:', redirectPath)
      } else {
        // If it's a full URL, validate it's on our domain
        const redirectToUrl = new URL(decodedRedirectTo)
        if (redirectToUrl.origin === requestUrl.origin) {
          redirectPath = redirectToUrl.pathname + redirectToUrl.search
          console.log('🔍 [AuthCallback] Using full URL path:', redirectPath)
        }
      }
    } catch (error) {
      console.error('🔍 [AuthCallback] Invalid redirect URL:', redirectTo, error)
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
    } catch (error) {
      console.error('Error checking admin status:', error)
      // If we can't determine admin status, send to user page as safer default
      redirectPath = '/my-products'
    }
  }
  
  // Use the request origin for redirects (works in any environment)
  const redirectUrl = new URL(redirectPath, requestUrl.origin)
  
  console.log('🔍 [AuthCallback] Final redirect:', {
    redirectPath,
    redirectUrl: redirectUrl.toString()
  })
  
  // Create redirect response and transfer auth cookies
  const redirectResponse = NextResponse.redirect(redirectUrl)
  
  // Transfer cookies from the temp response to the redirect response
  tempResponse.cookies.getAll().forEach(cookie => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  
  return redirectResponse
}