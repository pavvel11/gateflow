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
    <div className="mb-4 bg-sf-warning px-4 sm:px-8 py-3 text-sm text-sf-inverse font-semibold">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" strokeWidth={2.5} />
            <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth={2.5} />
          </svg>
          <span>
            {timeLeft ? t('bannerWithCountdown', { time: timeLeft }) : t('banner')}
            {' '}
            {t('readonlyNotice')}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-sf-inverse/70 hover:text-sf-inverse transition-opacity"
          aria-label={t('dismiss')}
        >
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
