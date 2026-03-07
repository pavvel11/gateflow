'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { validateEmailAction } from '@/lib/actions/validate-email'
import TurnstileWidget from './TurnstileWidget'
import TermsCheckbox from './TermsCheckbox'
import { useConfig } from '@/components/providers/config-provider'

type OAuthProvider = 'google' | 'github' | 'discord' | 'twitter' | 'azure' | 'facebook' | 'apple'

const OAUTH_ICONS: Record<OAuthProvider, React.ReactNode> = {
  google: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
  github: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  ),
  discord: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  ),
  twitter: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  azure: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 2L2 20h5.5l2-4h9l1 4H24L13.5 2zm-1 5.5l3.5 7h-6l2.5-7z"/>
    </svg>
  ),
  facebook: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  apple: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/>
    </svg>
  ),
}

const PROVIDER_NAMES: Record<OAuthProvider, string> = {
  google: 'Google',
  github: 'GitHub',
  discord: 'Discord',
  twitter: 'X',
  azure: 'Microsoft',
  facebook: 'Facebook',
  apple: 'Apple',
}

/**
 * Login form component that handles magic link authentication
 * In demo mode, switches to email+password login
 */
export default function LoginForm() {
  const { demoMode, oauthProviders } = useConfig()
  const [email, setEmail] = useState(demoMode ? 'demo@sellf.app' : '')
  const [password, setPassword] = useState(demoMode ? 'demo123' : '')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [sentEmail, setSentEmail] = useState(false)
  const [siteUrl, setSiteUrl] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetTrigger, setCaptchaResetTrigger] = useState(0)
  const [captchaLoading, setCaptchaLoading] = useState(false) // Will be set to true only when needed
  const t = useTranslations()

  // Get current site URL for redirects (works in any environment)
  useEffect(() => {
    setSiteUrl(window.location.origin)
  }, [])

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    if (!termsAccepted) {
      setMessage(t('compliance.pleaseAcceptTerms'))
      return
    }
    const supabase = await createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      // Demo mode: password login (skip captcha & terms)
      if (demoMode) {
        const supabase = await createClient()
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setMessage(error.message)
        }
        // On success, AuthContext will detect user and redirect
        setIsLoading(false)
        return
      }

      // Check if terms are accepted
      if (!termsAccepted) {
        setMessage(t('compliance.pleaseAcceptTerms'))
        setIsLoading(false)
        return
      }

      // Check if Turnstile token is present
      // In development, dummy token will be present, in production real verification is required
      if (!captchaToken) {
        setMessage(t('compliance.securityVerificationRequired'))
        setIsLoading(false)
        return
      }

      // Validate email against disposable email list
      const emailValidation = await validateEmailAction(email);

      if (emailValidation.isDisposable) {
        setMessage(t('auth.disposableEmailBlocked'));
        setSentEmail(false)
        setIsLoading(false)

        // Reset captcha after failed validation (token was consumed)
        resetCaptcha()
        return;
      }

      if (!emailValidation.isValid && emailValidation.error) {
        setMessage(t('auth.emailValidationFailed'));
        setSentEmail(false)
        setIsLoading(false)

        // Reset captcha after failed validation (token was consumed)
        resetCaptcha()
        return;
      }

      // Dynamic redirect URL for Supabase auth
      const redirectUrl = `${siteUrl}/auth/callback`

      const supabase = await createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          captchaToken: captchaToken || undefined,
        },
      })

      if (error) {
        setMessage(error.message)
        setSentEmail(false)

        // Reset captcha after ANY error (it was consumed in the failed request)
        resetCaptcha()
      } else {
        setSentEmail(true)
        setMessage(t('productView.checkEmailForMagicLink'))
      }
    } catch {
      setMessage(t('common.error'))
      setSentEmail(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to reset captcha - simple and reliable
  const resetCaptcha = () => {
    setCaptchaToken(null)
    setCaptchaLoading(true) // Start loading immediately on reset (for invisible captcha)
    setCaptchaResetTrigger(prev => prev + 1)
  }

  // OAuth provider buttons
  const renderOAuthButtons = () => {
    if (demoMode || oauthProviders.length === 0) return null
    return (
      <div className="mb-6">
        <TermsCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
        <div className="flex items-center justify-center gap-3 mt-4">
          {oauthProviders.map((provider) => {
            const p = provider as OAuthProvider
            const name = PROVIDER_NAMES[p] ?? provider
            return (
              <button
                key={p}
                type="button"
                onClick={() => handleOAuthSignIn(p)}
                aria-label={t('auth.signInWith', { provider: name })}
                title={t('auth.signInWith', { provider: name })}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-sf-raised border-2 border-sf-border-medium hover:border-sf-border-strong hover:bg-sf-hover transition-all duration-200 text-sf-heading"
              >
                {OAUTH_ICONS[p]}
              </button>
            )
          })}
        </div>
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-sf-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-sf-raised px-3 text-sf-muted">{t('auth.orContinueWith')}</span>
          </div>
        </div>
      </div>
    )
  }

  // Form display before email is sent
  const renderLoginForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-sf-heading mb-2">
          {t('auth.email')}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 bg-sf-float border border-sf-border rounded-xl text-sf-heading placeholder-sf-muted focus:outline-none focus:ring-2 focus:ring-sf-accent focus:border-transparent transition-all"
          placeholder={demoMode ? 'demo@sellf.app' : t('auth.emailPlaceholder')}
        />
      </div>

      {/* Password field - demo mode only */}
      {demoMode && (
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-sf-heading mb-2">
            {t('auth.password')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-sf-float border border-sf-border rounded-xl text-sf-heading placeholder-sf-muted focus:outline-none focus:ring-2 focus:ring-sf-accent focus:border-transparent transition-all"
            placeholder={t('auth.passwordPlaceholder')}
          />
        </div>
      )}

      {/* Terms and Conditions Checkbox - not needed in demo, not needed when already shown above OAuth buttons */}
      {!demoMode && oauthProviders.length === 0 && (
        <TermsCheckbox
          checked={termsAccepted}
          onChange={setTermsAccepted}
        />
      )}

      <button
        type="submit"
        disabled={isLoading || (!demoMode && captchaLoading)}
        className="w-full py-3 px-4 bg-sf-accent-bg hover:bg-sf-accent-hover text-white font-semibold rounded-full shadow-[var(--sf-shadow-accent)] hover:shadow-[0_6px_40px_-4px_var(--sf-accent-glow)] focus:outline-none focus:ring-2 focus:ring-sf-accent focus:ring-offset-2 focus:ring-offset-sf-deep transition-[background-color,box-shadow] duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {isLoading || (!demoMode && captchaLoading) ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-sf-heading" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {!demoMode && captchaLoading ? t('security.verifying') : (demoMode ? t('auth.signingIn') : t('productView.sendingMagicLink'))}
          </div>
        ) : (
          demoMode ? t('auth.signIn') : t('auth.sendMagicLink')
        )}
      </button>

      {/* Cloudflare Turnstile - not needed in demo */}
      {!demoMode && (
        <TurnstileWidget
          onVerify={(token) => {
            setCaptchaToken(token);
            setCaptchaLoading(false);
          }}
          onError={() => {
            setCaptchaToken(null);
            setCaptchaLoading(false);
          }}
          onTimeout={() => {
            setCaptchaLoading(false);
          }}
          resetTrigger={captchaResetTrigger}
        />
      )}

      {message && !sentEmail && (
        <div className="p-4 rounded-xl text-sm bg-sf-danger-soft text-sf-danger border border-sf-danger/20">
          {message}
        </div>
      )}
    </form>
  )

  // Success message after email is sent
  const renderSuccessMessage = () => {
    // Function to get email provider info
    const getEmailProviderInfo = (email: string): { name: string; domains: string[]; url: string; color: string } | null => {
      const domain = email.split('@')[1]?.toLowerCase()
      
      const providers = [
        {
          name: 'Gmail',
          domains: ['gmail.com', 'googlemail.com'],
          url: 'https://mail.google.com',
          color: 'from-red-500 to-red-600'
        },
        {
          name: 'Outlook',
          domains: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'],
          url: 'https://outlook.live.com',
          color: 'from-blue-500 to-blue-600'
        },
        {
          name: 'Yahoo',
          domains: ['yahoo.com', 'yahoo.co.uk', 'yahoo.de', 'yahoo.fr', 'ymail.com'],
          url: 'https://mail.yahoo.com',
          color: 'from-purple-500 to-purple-600'
        },
        {
          name: 'Apple Mail',
          domains: ['icloud.com', 'me.com', 'mac.com'],
          url: 'https://www.icloud.com/mail',
          color: 'from-gray-600 to-gray-700'
        },
        {
          name: 'Proton',
          domains: ['protonmail.com', 'proton.me'],
          url: 'https://mail.proton.me',
          color: 'from-indigo-500 to-indigo-600'
        }
      ]
      
      for (const provider of providers) {
        if (provider.domains.includes(domain)) {
          return provider
        }
      }
      
      // No fallback - return null for unsupported domains
      return null
    }

    const emailProvider = getEmailProviderInfo(email)
    
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <svg className="w-16 h-16 text-sf-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div className="p-4 rounded-xl text-sm bg-sf-success-soft text-sf-success border border-sf-success/20">
          {message}
        </div>
        
        <div className="text-sf-body text-sm space-y-3">
          <p>{t('productView.checkEmailAtForMagicLink', { email })}</p>
          <p>{t('auth.clickLinkToSignIn')}</p>
        </div>

        {/* Email Provider Buttons */}
        <div className="space-y-3">
          {emailProvider && (
            <button
              onClick={() => window.open(emailProvider.url, '_blank')}
              className="w-full py-3 px-4 bg-sf-accent-bg hover:bg-sf-accent-hover text-white font-semibold rounded-full shadow-[var(--sf-shadow-accent)] transition-colors duration-200 flex items-center justify-center space-x-2 active:scale-[0.98]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{t('auth.openEmailProvider', { provider: emailProvider.name })}</span>
            </button>
          )}
          
          <button
            onClick={() => {
              setSentEmail(false)
              setMessage('')
              setEmail('')
              setTermsAccepted(false)
              setCaptchaToken(null)
            }}
            className="w-full py-2 px-4 bg-sf-float text-sf-body font-medium rounded-full border border-sf-border hover:border-sf-border-accent transition-[border-color] duration-200"
          >
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-sf-raised/80 rounded-2xl p-8 shadow-[var(--sf-shadow-accent)] border border-sf-border">
      {!sentEmail ? (
        <>
          {renderOAuthButtons()}
          {renderLoginForm()}
        </>
      ) : renderSuccessMessage()}
    </div>
  )
}
