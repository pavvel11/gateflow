'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { AuthContextType } from '@/types/auth'

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  error: null,
  signOut: async () => {},
})

/**
 * AuthProvider component that manages authentication state
 * and provides auth-related data and methods to children.
 * Implementation meets production-ready standards with:
 * - Complete TypeScript typing
 * - Retry mechanism with exponential backoff
 * - Debouncing for auth state changes
 * - Memory leak prevention
 * - Comprehensive error handling
 * - Role-based access control using admin_users table
 * - Performance optimization
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State Management with Performance Tracking
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Performance and memory management refs
  const isMountedRef = useRef(true)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  /**
   * Fetches admin status with retry mechanism and exponential backoff
   */
  const checkAdminStatus = async (userId: string, retries = 3): Promise<boolean> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data, error } = await supabase.rpc('is_admin', { user_id_param: userId })
        
        if (error) {
          console.error(`Error checking admin status (attempt ${attempt}):`, error)
          
          if (attempt === retries) {
            return false // Default to non-admin after final attempt
          }
          
          // Exponential backoff: 1s, 2s, 3s
          await new Promise(resolve => setTimeout(resolve, attempt * 1000))
          continue
        }
        
        return Boolean(data)
      } catch (err) {
        console.error(`Error in checkAdminStatus (attempt ${attempt}):`, err)
        
        if (attempt === retries) {
          return false // Default to non-admin after final attempt
        }
        
        await new Promise(resolve => setTimeout(resolve, attempt * 1000))
      }
    }
    
    return false // Final fallback
  }

  /**
   * Handles auth state changes with debouncing to prevent multiple rapid updates
   */
  const handleAuthStateChange = useCallback(async (session: Session | null, immediate = false) => {
    // Clear existing debounce timer to prevent race conditions
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const processAuthChange = async () => {
      try {
        // Always check if component is still mounted
        if (!isMountedRef.current) return

        const currentUser = session?.user ?? null
        
        console.log('AuthContext: Setting user:', {
          hasSession: !!session,
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          userEmailVerified: currentUser?.email_confirmed_at,
          userMetadata: currentUser?.user_metadata,
          userAppMetadata: currentUser?.app_metadata
        });
        
        // Set user immediately for responsive UI
        setUser(currentUser)
        setError(null)
        
        // Check admin status if user exists
        if (currentUser) {
          const adminStatus = await checkAdminStatus(currentUser.id)
          
          // Check again after async operation
          if (!isMountedRef.current) return
          
          setIsAdmin(adminStatus)
          
          // Claim any guest purchases for this user
          try {
            const response = await fetch('/api/claim-guest-purchases', {
              method: 'POST',
              credentials: 'include',
            })
            
            if (response.ok) {
              const data = await response.json()
              if (data.claimedCount > 0) {
                console.log(`🎉 Claimed ${data.claimedCount} guest purchases for user`)
              }
            }
          } catch (error) {
            console.error('Error claiming guest purchases:', error)
            // Don't block the authentication process if claiming fails
          }
        } else {
          setIsAdmin(false)
        }
      } catch (err) {
        console.error('Error in auth state change:', err)
        
        if (isMountedRef.current) {
          setError('Authentication error occurred')
        }
      } finally {
        // Always set loading to false if component is mounted
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    if (immediate) {
      // Process immediately for initial load
      await processAuthChange()
    } else {
      // Debounce for subsequent changes to prevent rapid updates
      debounceTimerRef.current = setTimeout(processAuthChange, 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  /**
   * Initializes auth state by getting the current session
   */
  const initializeAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (!isMountedRef.current) return

      if (error) {
        console.error('Error fetching session:', error.message)
        setError(error.message)
        setLoading(false)
        return
      }
      
      // Use immediate processing for initial session
      await handleAuthStateChange(session, true)
    } catch (err) {
      console.error('Error in session initialization:', err)
      
      if (isMountedRef.current) {
        setError('Failed to initialize authentication')
        setLoading(false)
      }
    }
  }

  /**
   * Signs out the current user with proper error handling
   */
  const signOut = async () => {
    try {
      setLoading(true)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error signing out:', error)
        
        if (isMountedRef.current) {
          setError('Failed to sign out')
        }
      }
      
      // Navigate to login after sign out
      router.replace('/login')
    } catch (err) {
      console.error('Error in signOut:', err)
      
      if (isMountedRef.current) {
        setError('Failed to sign out')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  // Set up authentication state and listeners
  useEffect(() => {
    let mounted = true
    isMountedRef.current = true

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      // Don't set loading for subsequent auth changes to prevent UI flicker
      if (event !== 'INITIAL_SESSION') {
        await handleAuthStateChange(session, false)
      }
    })

    return () => {
      // Comprehensive cleanup
      mounted = false
      isMountedRef.current = false
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleAuthStateChange]) // initializeAuth is defined inline and supabase.auth is stable

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        error,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access authentication context
 */
export function useAuth() {
  return useContext(AuthContext)
}
