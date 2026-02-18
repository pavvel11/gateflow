'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useConfig } from '@/components/providers/config-provider'

/**
 * Demo Mode Banner — shown in dashboard when DEMO_MODE=true (via runtime config)
 *
 * Amber info banner with countdown to reset, readonly warning, and credentials.
 * Dismissible per session.
 */
export default function DemoBanner() {
  const { demoMode } = useConfig()
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('demo-banner-dismissed') === 'true'
  })
  const [timeLeft, setTimeLeft] = useState('')

  const t = useTranslations('demo')

  useEffect(() => {
    if (!demoMode) return

    function update() {
      const now = new Date()
      const nextHour = new Date(now)
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
      const diffMs = nextHour.getTime() - now.getTime()
      const mins = Math.floor(diffMs / 60000)
      const secs = Math.floor((diffMs % 60000) / 1000)
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [demoMode])

  if (!demoMode || dismissed) {
    return null
  }

  const handleDismiss = () => {
    sessionStorage.setItem('demo-banner-dismissed', 'true')
    setDismissed(true)
  }

  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p>
            <span className="font-medium">{timeLeft ? t('bannerWithCountdown', { time: timeLeft }) : t('banner')}</span>
            {' '}
            <span className="text-amber-700 dark:text-amber-300">{t('readonlyNotice')}</span>
          </p>
          <p className="mt-1.5 flex flex-wrap gap-2">
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/50">
              {t('credentials')}
            </code>
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/50">
              {t('testCard')}
            </code>
          </p>
        </div>
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
