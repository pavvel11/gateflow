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
  
  // Redirect authenticated users away from login page
  if (session && isLoginRoute) {
    return NextResponse.redirect(new URL('/dashboard', origin))
  }
  
  // Public routes that don't require authentication
  const isPublicRoute = isLoginRoute || isAuthRoute || isAccessDeniedRoute || isProductPageRoute || isProductRedirectRoute
  
  // Redirect unauthenticated users to login page for protected routes (but not for product pages)
  if (
    !session && 
    !isPublicRoute
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
