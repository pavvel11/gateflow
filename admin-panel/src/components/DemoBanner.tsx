'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Demo Mode Banner — shown in dashboard when NEXT_PUBLIC_DEMO_MODE=true
 *
 * Amber info banner with test card info. Dismissible per session.
 */
export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('demo-banner-dismissed') === 'true'
  })

  const t = useTranslations('demo')

  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' || dismissed) {
    return null
  }

  const handleDismiss = () => {
    sessionStorage.setItem('demo-banner-dismissed', 'true')
    setDismissed(true)
  }

  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
      <div className="flex items-center justify-between gap-3">
        <p>
          <span className="font-medium">{t('banner')}</span>
          {' '}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/50">
            {t('testCard')}
          </code>
        </p>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
          aria-label={t('dismiss')}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
