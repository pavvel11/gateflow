import { User } from '@supabase/supabase-js'

/**
 * Authentication context type definition with comprehensive state
 */
export interface AuthContextType {
  user: User | null
  isAdmin: boolean
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
}
