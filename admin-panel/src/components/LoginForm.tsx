'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { validateEmailAction } from '@/lib/actions/validate-email'
import TurnstileWidget from './TurnstileWidget'
import TermsCheckbox from './TermsCheckbox'

/**
 * Login form component that handles magic link authentication
 */
export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [sentEmail, setSentEmail] = useState(false)
  const [siteUrl, setSiteUrl] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const t = useTranslations()

  // Get current site URL for redirects (works in any environment)
  useEffect(() => {
    setSiteUrl(window.location.origin)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
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
        setMessage('Disposable email addresses are not allowed. Please use a permanent email address.');
        setSentEmail(false)
        setIsLoading(false)
        return;
      }

      if (!emailValidation.isValid && emailValidation.error) {
        setMessage('Email validation failed. Please try again.');
        setSentEmail(false)
        setIsLoading(false)
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

  // Form display before email is sent
  const renderLoginForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
          {t('auth.email')}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          placeholder="admin@example.com"
        />
      </div>

      {/* Terms and Conditions Checkbox */}
      <TermsCheckbox
        checked={termsAccepted}
        onChange={setTermsAccepted}
      />

      {/* Cloudflare Turnstile - always visible now, with different behavior for dev/prod */}
      <TurnstileWidget
        onVerify={setCaptchaToken}
        onError={() => setCaptchaToken(null)}
      />

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('productView.sendingMagicLink')}
          </div>
        ) : (
          t('auth.sendMagicLink')
        )}
      </button>

      {message && !sentEmail && (
        <div className="p-4 rounded-xl text-sm bg-red-500/10 text-red-400 border border-red-500/20">
          {message}
        </div>
      )}
    </form>
  )

  // Success message after email is sent
  const renderSuccessMessage = () => {
    // Function to get email provider info
    const getEmailProviderInfo = (email: string) => {
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
      
      // Generic webmail fallback
      return {
        name: 'Webmail',
        domains: [domain],
        url: `https://${domain}`,
        color: 'from-green-500 to-green-600'
      }
    }

    const emailProvider = getEmailProviderInfo(email)
    
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div className="p-4 rounded-xl text-sm bg-green-500/10 text-green-400 border border-green-500/20">
          {message}
        </div>
        
        <div className="text-gray-300 text-sm space-y-3">
          <p>{t('productView.checkEmailAtForMagicLink', { email })}</p>
          <p>{t('auth.clickLinkToSignIn')}</p>
        </div>

        {/* Email Provider Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => window.open(emailProvider.url, '_blank')}
            className={`w-full py-3 px-4 bg-gradient-to-r ${emailProvider.color} text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Otwórz {emailProvider.name}</span>
          </button>
          
          <button
            onClick={() => {
              setSentEmail(false)
              setMessage('')
              setEmail('')
              setTermsAccepted(false)
              setCaptchaToken(null)
            }}
            className="w-full py-2 px-4 bg-white/5 text-gray-300 font-medium rounded-xl border border-white/20 hover:bg-white/10 transition-all duration-200"
          >
            Powrót do logowania
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
      {!sentEmail ? renderLoginForm() : renderSuccessMessage()}
    </div>
  )
}
