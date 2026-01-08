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
