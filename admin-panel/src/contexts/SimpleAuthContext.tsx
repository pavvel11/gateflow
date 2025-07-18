'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface SimpleAuthContextType {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
}

const SimpleAuthContext = createContext<SimpleAuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  signOut: async () => {}
})

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      
      // Check if user is admin from database
      if (session?.user?.id) {
        try {
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('user_id')
            .eq('user_id', session.user.id)
            .single()
          
          setIsAdmin(!!adminData)
        } catch {
          setIsAdmin(false)
        }
      }
      
      setIsLoading(false)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        // Check admin status from database
        if (session?.user?.id) {
          try {
            const { data: adminData } = await supabase
              .from('admin_users')
              .select('user_id')
              .eq('user_id', session.user.id)
              .single()
            
            setIsAdmin(!!adminData)
          } catch {
            setIsAdmin(false)
          }
        } else {
          setIsAdmin(false)
        }
        
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <SimpleAuthContext.Provider value={{ user, isLoading, isAdmin, signOut }}>
      {children}
    </SimpleAuthContext.Provider>
  )
}

export function useSimpleAuth() {
  return useContext(SimpleAuthContext)
}
