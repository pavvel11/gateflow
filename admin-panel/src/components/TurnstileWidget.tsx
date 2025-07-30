'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile'

// Cloudflare dummy sitekeys for testing
const DUMMY_SITEKEYS = {
  ALWAYS_PASSES_VISIBLE: '1x00000000000000000000AA',
  ALWAYS_BLOCKS_VISIBLE: '2x00000000000000000000AB', 
  ALWAYS_PASSES_INVISIBLE: '1x00000000000000000000BB',
  ALWAYS_BLOCKS_INVISIBLE: '2x00000000000000000000BB',
  INTERACTIVE_CHALLENGE: '3x00000000000000000000FF'
} as const

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onError?: () => void
  onTimeout?: () => void
  onBeforeInteractive?: () => void
  siteKey?: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  /** For development testing: choose dummy sitekey behavior */
  testMode?: keyof typeof DUMMY_SITEKEYS
}

export default function TurnstileWidget({
  onVerify,
  onError,
  onTimeout,
  onBeforeInteractive,
  siteKey,
  theme = 'dark',
  size = 'normal',
  testMode
}: TurnstileWidgetProps) {
  const turnstileRef = useRef<TurnstileInstance>(null)
  const t = useTranslations('security')

  // Determine which sitekey to use
  const getSiteKey = () => {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (isDevelopment) {
      // Get testMode from env variable or prop, with fallback
      const envTestMode = process.env.NEXT_PUBLIC_TURNSTILE_TEST_MODE as keyof typeof DUMMY_SITEKEYS
      const effectiveTestMode = envTestMode || testMode || 'ALWAYS_PASSES_VISIBLE'
      
      // Validate the test mode
      if (effectiveTestMode in DUMMY_SITEKEYS) {
        return DUMMY_SITEKEYS[effectiveTestMode]
      } else {
        console.warn(`Invalid TURNSTILE_TEST_MODE: ${effectiveTestMode}. Using ALWAYS_PASSES_VISIBLE.`)
        return DUMMY_SITEKEYS.ALWAYS_PASSES_VISIBLE
      }
    } else {
      // Use provided sitekey or fallback to env variable for production
      return siteKey || process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY
    }
  }

  const effectiveSiteKey = getSiteKey()
  
  // Get effective test mode for development info
  const isDevelopment = process.env.NODE_ENV === 'development'
  const envTestMode = process.env.NEXT_PUBLIC_TURNSTILE_TEST_MODE as keyof typeof DUMMY_SITEKEYS
  const effectiveTestMode = isDevelopment ? (envTestMode || testMode || 'ALWAYS_PASSES_VISIBLE') : null

  useEffect(() => {
    // Reset widget when component unmounts
    const currentRef = turnstileRef.current
    return () => {
      if (currentRef) {
        try {
          currentRef.reset()
        } catch {
          // Ignore reset errors during cleanup
        }
      }
    }
  }, [])

  if (!effectiveSiteKey) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-300">
        ⚠️ {t('turnstileNotConfigured')}
      </div>
    )
  }

  // Show development info when using dummy keys
  const dummyValues = Object.values(DUMMY_SITEKEYS) as string[]
  const isUsingDummyKey = isDevelopment && dummyValues.includes(effectiveSiteKey)

  const handleSuccess = (token: string) => {
    onVerify(token)
  }

  const handleError = () => {
    onError?.()
  }

  const handleExpire = () => {
    onError?.()
  }

  const handleTimeout = () => {
    onTimeout?.()
  }

  const handleBeforeInteractive = () => {
    onBeforeInteractive?.()
  }

  return (
    <div className="mb-4">
      <div className="flex justify-center">
        <Turnstile
          ref={turnstileRef}
          siteKey={effectiveSiteKey}
          options={{
            theme,
            size,
            retry: 'auto'
          }}
          onSuccess={handleSuccess}
          onError={handleError}
          onExpire={handleExpire}
          onTimeout={handleTimeout}
          onBeforeInteractive={handleBeforeInteractive}
        />
      </div>
      
      {/* Minimal development info - only show test mode as tiny text */}
      {isUsingDummyKey && (
        <div className="text-xs text-gray-500 mt-1 opacity-50 text-center">
          🧪 {effectiveTestMode}
        </div>
      )}
    </div>
  )
}
