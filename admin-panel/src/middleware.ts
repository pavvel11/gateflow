import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware for handling authentication and redirects
 * - Protects routes that require authentication
 * - Redirects authenticated users away from login page
 * - Uses dynamic URL based on request for compatibility with any environment
 */
export async function middleware(request: NextRequest) {
  // Skip middleware for API routes and static files
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next()
  }
  
  // Get base URL from current request (works in any environment)
  const origin = request.nextUrl.origin
  const response = NextResponse.next()
  
  // Create Supabase client for authentication
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
        }
      }
    }
  )
  
  // Get current session
  const { data: { session } } = await supabase.auth.getSession()
  
  // Identify route types
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')
  const isLoginRoute = request.nextUrl.pathname === '/login'
  const isAccessDeniedRoute = request.nextUrl.pathname === '/access-denied'
  const isProductPageRoute = request.nextUrl.pathname.startsWith('/p/')
  const isProductRedirectRoute = request.nextUrl.pathname.startsWith('/product/')
  const isHomeRoute = request.nextUrl.pathname === '/'
  
  // Check if this might be a 404 route by looking at common protected paths
  // If it's not a known protected route pattern, allow it through (let Next.js handle 404)
  const isKnownProtectedRoute = 
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/settings') ||
    request.nextUrl.pathname.startsWith('/profile')
  
  // Redirect authenticated users away from login page
  if (session && isLoginRoute) {
    return NextResponse.redirect(new URL('/dashboard', origin))
  }
  
  // Public routes that don't require authentication
  const isPublicRoute = isLoginRoute || isAuthRoute || isAccessDeniedRoute || isProductPageRoute || isProductRedirectRoute || isHomeRoute
  
  // Only redirect to login for known protected routes when user is not authenticated
  // This allows 404 pages and other unknown routes to be handled by Next.js
  if (
    !session && 
    !isPublicRoute &&
    isKnownProtectedRoute
  ) {
    return NextResponse.redirect(new URL('/login', origin))
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static images
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
