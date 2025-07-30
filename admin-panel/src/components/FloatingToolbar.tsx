'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslations } from 'next-intl'
import { locales } from '@/lib/locales'

const languages = {
  en: { name: 'English', flag: '🇺🇸', short: 'EN' },
  pl: { name: 'Polski', flag: '🇵🇱', short: 'PL' }
}

interface FloatingToolbarProps {
  position?: 'top-right' | 'bottom-right'
}

export default function FloatingToolbar({ 
  position = 'top-right'
}: FloatingToolbarProps) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const t = useTranslations('navigation')
  
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isAuthLoading, setIsAuthLoading] = useState(false)

  const handleLanguageChange = (newLocale: string) => {
    startTransition(() => {
      document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
      
      const segments = pathname.split('/').filter(Boolean)
      const currentLocale = segments[0]
      
      let newPath = ''
      if (locales.includes(currentLocale as (typeof locales)[number])) {
        newPath = `/${newLocale}/${segments.slice(1).join('/')}`
      } else {
        newPath = `/${newLocale}${pathname}`
      }
      
      router.push(newPath)
      setIsLanguageOpen(false)
    })
  }

  const handleLogin = () => {
    router.push('/login')
  }

  const positionClasses = {
    'top-right': 'top-4 right-4 sm:top-6 sm:right-6',
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6'
  }

  const currentLanguage = languages[locale as keyof typeof languages]
  const isLoading = isPending || isAuthLoading

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Unified Toolbar */}
      <div className="flex items-center gap-1 p-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-lg hover:shadow-xl transition-all duration-200">
        
        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsLanguageOpen(!isLanguageOpen)}
            disabled={isLoading}
            className={`flex items-center justify-center w-8 h-8 hover:bg-white/20 rounded-full transition-all duration-200 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
            }`}
            aria-label="Switch language"
            title={`Language: ${currentLanguage.name}`}
          >
            <span className="text-sm">{currentLanguage.flag}</span>
          </button>

          {isLanguageOpen && (
            <>
              <div className="absolute top-full right-0 mt-2 w-32 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl z-50">
                <div className="p-1">
                  {Object.entries(languages).map(([code, lang]) => (
                    <button
                      key={code}
                      onClick={() => handleLanguageChange(code)}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors ${
                        locale === code
                          ? 'bg-white/20 text-white'
                          : 'text-white/80 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span className="font-medium">{lang.short}</span>
                      {locale === code && (
                        <svg className="w-3 h-3 ml-auto text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsLanguageOpen(false)}
              />
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-white/20" />

        {/* Auth Button/Menu */}
        <div className="relative">
          {user ? (
            <>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                disabled={isLoading}
                className={`flex items-center justify-center w-8 h-8 hover:bg-white/20 rounded-full transition-all duration-200 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                }`}
                aria-label="User menu"
                title={`${user.email}`}
              >
                <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </button>

              {isUserMenuOpen && (
                <>
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-white/80 border-b border-white/20">
                        {user.email}
                      </div>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          router.push('/my-products')
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                      >
                        {t('myProducts')}
                      </button>
                      <button
                        onClick={async () => {
                          setIsUserMenuOpen(false)
                          setIsAuthLoading(true)
                          try {
                            await signOut()
                            window.location.reload()
                          } catch (error) {
                            console.error('Logout error:', error)
                            setIsAuthLoading(false)
                          }
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                      >
                        {t('logout')}
                      </button>
                    </div>
                  </div>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                </>
              )}
            </>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className={`flex items-center justify-center w-8 h-8 hover:bg-white/20 rounded-full transition-all duration-200 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              }`}
              aria-label={t('login')}
              title={t('login')}
            >
              {isLoading ? (
                <svg className="w-3 h-3 animate-spin text-white/70" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
