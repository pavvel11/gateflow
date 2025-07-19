'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface FloatingAuthButtonProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  variant?: 'minimal' | 'discrete'
}

export default function FloatingAuthButton({ 
  position = 'top-left',
  variant = 'discrete'
}: FloatingAuthButtonProps) {
  const { user, signOut } = useAuth()
  const t = useTranslations('auth')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleAuthAction = async () => {
    if (!user) {
      // User not logged in - redirect to login
      router.push('/login')
    } else {
      // User logged in - sign out and stay on current page
      setIsLoading(true)
      try {
        await signOut()
        // Refresh current page after logout
        window.location.reload()
      } catch (error) {
        console.error('Logout error:', error)
        setIsLoading(false)
      }
    }
  }

  const positionClasses = {
    'top-right': 'top-4 right-4 sm:top-6 sm:right-6',
    'top-left': 'top-4 left-4 sm:top-6 sm:left-6',
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6'
  }

  // Discrete variant - very subtle, small
  if (variant === 'discrete') {
    return (
      <div className={`fixed ${positionClasses[position]} z-50 opacity-70 hover:opacity-100 transition-opacity duration-300`}>
        <button
          onClick={handleAuthAction}
          disabled={isLoading}
          className={`group flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-black/30 hover:border-white/20 transition-all duration-200 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          aria-label={user ? t('logout') : t('login')}
          title={user ? t('logout') : t('login')}
        >
          {isLoading ? (
            <svg className="w-3 h-3 animate-spin text-white/70" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : user ? (
            <svg className="w-3 h-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          )}
        </button>
      </div>
    )
  }

  // Minimal variant - slightly larger with text
  return (
    <div className={`fixed ${positionClasses[position]} z-50 opacity-80 hover:opacity-100 transition-opacity duration-300`}>
      <button
        onClick={handleAuthAction}
        disabled={isLoading}
        className={`group flex items-center gap-2 px-3 py-2 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-black/30 hover:border-white/20 transition-all duration-200 ${
          isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
        }`}
        aria-label={user ? t('logout') : t('login')}
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin text-white/70" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : user ? (
          <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        )}
        <span className="text-xs font-medium text-white/70 hidden sm:inline">
          {user ? t('logout') : t('login')}
        </span>
      </button>
    </div>
  )
}
