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

// Add security headers to response
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Add HSTS header unless disabled (e.g., when behind reverse proxy with SSL termination)
  if (process.env.DISABLE_HSTS !== 'true') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Block deprecated /api/admin/* endpoints (except payments)
  // Set ALLOW_DEPRECATED_API=true to re-enable
  if (
    pathname.startsWith('/api/admin/') &&
    !pathname.startsWith('/api/admin/payments/') &&
    process.env.ALLOW_DEPRECATED_API !== 'true'
  ) {
    return addSecurityHeaders(NextResponse.json(
      {
        error: 'Deprecated API endpoint',
        message: `Use /api/v1/* instead of ${pathname}`,
        hint: 'Set ALLOW_DEPRECATED_API=true to temporarily re-enable',
      },
      { status: 503 }
    ));
  }

  // Skip proxy processing for API routes, static files, and payment success page
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/payment') ||
    pathname.startsWith('/test-pages') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|js|css|html)$/)
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Extract locale from pathname early to determine route type
  const localeMatch = pathname.match(/^\/([a-z]{2})(?:\/|$)/)
  const locale = localeMatch ? localeMatch[1] : ''

  // Remove locale from pathname to get actual path
  const actualPath = locale && locales.includes(locale as typeof locales[number])
    ? pathname.replace(`/${locale}`, '') || '/'
    : pathname

  // Determine if route needs auth checking
  const isProtectedRoute =
    actualPath.startsWith('/dashboard') ||
    actualPath.startsWith('/my-products') ||
    actualPath.startsWith('/admin')
  const isLoginRoute = actualPath === '/login'
  const needsAuth = isProtectedRoute || isLoginRoute

  // Apply internationalization middleware first
  const intlResponse = intlMiddleware(request)

  // If intl middleware redirects, return that response with security headers
  if (intlResponse.status === 302 || intlResponse.status === 301) {
    return addSecurityHeaders(intlResponse as NextResponse)
  }

  // Public routes (checkout, about, landing, etc.) - skip Supabase overhead
  if (!needsAuth) {
    return addSecurityHeaders(intlResponse as NextResponse)
  }

  // Auth-required routes: create response with cookie support
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

  // Auth logic
  if (session && isLoginRoute) {
    const redirectPath = locale ? `/${locale}/dashboard` : '/dashboard'
    return addSecurityHeaders(NextResponse.redirect(new URL(redirectPath, request.url)))
  }

  if (!session && isProtectedRoute) {
    const redirectPath = locale ? `/${locale}/login` : '/login'
    return addSecurityHeaders(NextResponse.redirect(new URL(redirectPath, request.url)))
  }

  return addSecurityHeaders(response);
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
