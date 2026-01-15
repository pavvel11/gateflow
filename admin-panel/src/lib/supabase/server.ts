import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  // Use server-side environment variables
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
  const isProduction = process.env.NODE_ENV === 'production'

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // For cross-origin support in production, use SameSite=None; Secure
              cookieStore.set(name, value, {
                ...(options as object),
                sameSite: isProduction ? 'none' : ((options?.sameSite as 'lax' | 'strict' | 'none' | undefined) ?? 'lax'),
                secure: isProduction ? true : ((options?.secure as boolean | undefined) ?? false),
              })
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Create a public Supabase client without cookie handling.
 * This client is suitable for ISR (Incremental Static Regeneration) pages
 * as it doesn't force Dynamic Rendering like cookies() does.
 *
 * Use this for:
 * - Public pages that can be cached (homepage, product pages, etc.)
 * - Pages with `export const revalidate = N`
 * - API routes that return public data
 *
 * DO NOT use this for:
 * - User-specific data
 * - Admin pages
 * - Authenticated operations
 */
export function createPublicClient() {
  // Fallback to publicly available env vars for build-time static generation
  // Runtime: SUPABASE_URL / SUPABASE_ANON_KEY (if set)
  // Build time: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (from .env.fullstack)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.ANON_KEY

  // If env vars are not available (e.g., during build without .env file),
  // use dummy values to allow build to complete. ISR pages will be marked as dynamic.
  // In production with proper env vars, ISR will work correctly.
  const url = supabaseUrl || 'http://localhost:54321'
  const key = supabaseAnonKey || 'dummy-anon-key-for-build-time'

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}
