'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { locales } from '@/lib/locales'

const languages = {
  en: { name: 'English', flag: '🇺🇸', short: 'EN' },
  pl: { name: 'Polski', flag: '🇵🇱', short: 'PL' }
}

export default function LanguageSwitcher() {
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

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`group flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md ${
          isPending ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        aria-label="Switch language"
      >
        <span className="text-base">{languages[locale as keyof typeof languages].flag}</span>
        <span className="hidden sm:inline">{languages[locale as keyof typeof languages].name}</span>
        <span className="sm:hidden font-semibold">{languages[locale as keyof typeof languages].short}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg shadow-xl z-50">
          <div className="py-1">
            {Object.entries(languages).map(([code, lang]) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code)}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-white/10 transition-colors duration-200 ${
                  locale === code
                    ? 'bg-white/10 text-white border-r-2 border-purple-400'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
                {locale === code && (
                  <svg className="w-4 h-4 ml-auto text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
