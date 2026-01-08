import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './lib/locales'

// Create next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
})

export async function proxy(request: NextRequest) {
  // Skip proxy processing for API routes, static files, and payment success page
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/payment') ||
    request.nextUrl.pathname.startsWith('/test-pages') ||
    request.nextUrl.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|js|css|html)$/)
  ) {
    return NextResponse.next()
  }

  // Apply internationalization middleware first
  const intlResponse = intlMiddleware(request)
  
  // If intl middleware redirects, return that response
  if (intlResponse.status === 302 || intlResponse.status === 301) {
    return intlResponse
  }

  // Create response based on intl middleware
  const response = new NextResponse(intlResponse.body, {
    status: intlResponse.status,
    headers: intlResponse.headers
  })
  
  // Create Supabase client for authentication
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
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

  const pathname = request.nextUrl.pathname
  
  // Extract locale from pathname
  const localeMatch = pathname.match(/^\/([a-z]{2})(?:\/|$)/)
  const locale = localeMatch ? localeMatch[1] : ''
  
  // Remove locale from pathname to get actual path
  const actualPath = locale && locales.includes(locale as typeof locales[number]) 
    ? pathname.replace(`/${locale}`, '') || '/'
    : pathname

  // Don't redirect root path - allow landing page to be shown
  // Landing page will handle navigation based on auth state
  
  // Protected routes
  const isProtectedRoute = 
    actualPath.startsWith('/dashboard') ||
    actualPath.startsWith('/my-products') ||
    actualPath.startsWith('/admin')

  const isLoginRoute = actualPath === '/login'

  // Auth logic
  if (session && isLoginRoute) {
    const redirectPath = locale ? `/${locale}/dashboard` : '/dashboard'
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  if (!session && isProtectedRoute) {
    const redirectPath = locale ? `/${locale}/login` : '/login'
    return NextResponse.redirect(new URL(redirectPath, request.url))
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
