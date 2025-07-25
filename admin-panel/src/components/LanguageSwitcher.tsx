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
      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[65]"
          onClick={() => setIsOpen(false)}
        />
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`flex items-center justify-between w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
          isPending ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <span className="text-xs text-gray-500 dark:text-gray-400">Language</span>
        <div className="flex items-center gap-2">
          <span className="text-sm">{languages[locale as keyof typeof languages].flag}</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{languages[locale as keyof typeof languages].name}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-[70]">
          <div className="py-1">
            {Object.entries(languages).map(([code, lang]) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
                  locale === code
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-sm">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
                {locale === code && (
                  <svg className="w-4 h-4 ml-auto text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
