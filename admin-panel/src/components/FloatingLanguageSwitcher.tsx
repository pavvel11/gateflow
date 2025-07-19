'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { locales } from '@/lib/locales'

const languages = {
  en: { name: 'English', flag: '🇺🇸', short: 'EN' },
  pl: { name: 'Polski', flag: '🇵🇱', short: 'PL' }
}

interface FloatingLanguageSwitcherProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  variant?: 'minimal' | 'compact' | 'discrete' | 'full'
}

export default function FloatingLanguageSwitcher({ 
  position = 'top-right',
  variant = 'discrete'
}: FloatingLanguageSwitcherProps) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleLanguageChange = (newLocale: string) => {
    startTransition(() => {
      // Set cookie to persist language choice
      document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
      
      // Remove current locale from pathname
      const segments = pathname.split('/').filter(Boolean)
      const currentLocale = segments[0]
      
      let newPath = ''
      if (locales.includes(currentLocale as (typeof locales)[number])) {
        // Remove current locale and add new one
        newPath = `/${newLocale}/${segments.slice(1).join('/')}`
      } else {
        // Add new locale to current path
        newPath = `/${newLocale}${pathname}`
      }
      
      // Navigate to new path
      router.push(newPath)
      setIsOpen(false)
    })
  }

  const positionClasses = {
    'top-right': 'top-4 right-4 sm:top-6 sm:right-6',
    'top-left': 'top-4 left-4 sm:top-6 sm:left-6',
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6'
  }

  const currentLanguage = languages[locale as keyof typeof languages]

  // Discrete variant - very subtle, small, only shows flag
  if (variant === 'discrete') {
    return (
      <div className={`fixed ${positionClasses[position]} z-50 opacity-70 hover:opacity-100 transition-opacity duration-300`}>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={isPending}
            className={`group flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-black/30 hover:border-white/20 transition-all duration-200 ${
              isPending ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            aria-label="Switch language"
          >
            <span className="text-sm">{currentLanguage.flag}</span>
          </button>

          {isOpen && (
            <>
              <div className="absolute top-full right-0 mt-1 w-28 bg-black/40 backdrop-blur-md border border-white/20 rounded-lg shadow-xl z-50">
                <div className="p-1">
                  {Object.entries(languages).map(([code, lang]) => (
                    <button
                      key={code}
                      onClick={() => handleLanguageChange(code)}
                      className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md transition-colors ${
                        locale === code
                          ? 'bg-white/20 text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-sm">{lang.flag}</span>
                      <span className="font-medium">{lang.short}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
            </>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={`fixed ${positionClasses[position]} z-50 opacity-60 hover:opacity-100 transition-opacity duration-300`}>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={isPending}
            className={`group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-black/10 backdrop-blur-sm border border-white/10 rounded-full hover:bg-black/20 hover:border-white/20 transition-all duration-200 shadow-sm hover:shadow-md ${
              isPending ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
            }`}
            aria-label="Switch language"
          >
            <span className="text-base sm:text-lg">{currentLanguage.flag}</span>
          </button>

          {isOpen && (
            <>
              <div className="absolute top-full right-0 mt-2 w-32 bg-black/20 backdrop-blur-md border border-white/20 rounded-xl shadow-xl z-50">
                <div className="p-1">
                  {Object.entries(languages).map(([code, lang]) => (
                    <button
                      key={code}
                      onClick={() => handleLanguageChange(code)}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                        locale === code
                          ? 'bg-white/20 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span className="font-medium">{lang.short}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 opacity-80 hover:opacity-100 transition-opacity duration-300`}>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isPending}
          className={`group flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-black/20 backdrop-blur-md border border-white/15 rounded-full hover:bg-black/30 hover:border-white/25 transition-all duration-200 shadow-md hover:shadow-lg ${
            isPending ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
          }`}
        >
          <span className="text-base">{currentLanguage.flag}</span>
          <span className="hidden sm:inline text-sm font-medium text-white">{currentLanguage.name}</span>
          <span className="sm:hidden text-sm font-medium text-white">{currentLanguage.short}</span>
          <svg
            className={`w-3 h-3 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div className="absolute top-full right-0 mt-2 w-40 sm:w-48 bg-black/30 backdrop-blur-md border border-white/20 rounded-xl shadow-xl z-50">
              <div className="p-1">
                {Object.entries(languages).map(([code, lang]) => (
                  <button
                    key={code}
                    onClick={() => handleLanguageChange(code)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      locale === code
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span className="font-medium">{lang.name}</span>
                    {locale === code && (
                      <svg className="w-4 h-4 ml-auto text-white/60" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
          </>
        )}
      </div>
    </div>
  )
}
