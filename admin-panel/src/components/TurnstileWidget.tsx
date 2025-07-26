'use client'

import { useEffect, useRef, useState } from 'react'

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onError?: () => void
  siteKey?: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
}

interface TurnstileOptions {
  sitekey: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  callback?: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
}

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
      getResponse: (widgetId: string) => string
    }
  }
}

export default function TurnstileWidget({
  onVerify,
  onError,
  siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY,
  theme = 'dark',
  size = 'normal'
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // Skip if no site key
    if (!siteKey) {
      setError('Turnstile site key not configured')
      return
    }

    // Load Turnstile script if not already loaded
    if (!window.turnstile && !document.querySelector('script[src*="challenges.cloudflare.com"]')) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      script.onload = () => setIsLoaded(true)
      script.onerror = () => {
        setError('Failed to load Turnstile')
        onError?.()
      }
      document.head.appendChild(script)
    } else if (window.turnstile) {
      setIsLoaded(true)
    }
  }, [siteKey, onError])

  useEffect(() => {
    if (isLoaded && window.turnstile && containerRef.current && siteKey) {
      try {
        // Remove existing widget if any
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current)
        }

        // Render new widget
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          callback: (token: string) => {
            onVerify(token)
          },
          'error-callback': () => {
            setError('Turnstile verification failed')
            onError?.()
          },
          'expired-callback': () => {
            setError('Turnstile token expired')
            onError?.()
          }
        })
      } catch {
        setError('Failed to render Turnstile widget')
        onError?.()
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }, [isLoaded, siteKey, theme, size, onVerify, onError])

  if (!siteKey) {
    return (
      <div className="p-3 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        ⚠️ Turnstile not configured (development mode)
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
        {error}
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <div ref={containerRef} />
    </div>
  )
}
