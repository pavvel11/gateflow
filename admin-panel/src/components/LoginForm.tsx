'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

/**
 * Login form component that handles magic link authentication
 */
export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [sentEmail, setSentEmail] = useState(false)
  const [siteUrl, setSiteUrl] = useState('')
  const supabase = createClient()

  // Get current site URL for redirects (works in any environment)
  useEffect(() => {
    setSiteUrl(window.location.origin)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      // Dynamic redirect URL for Supabase auth
      const redirectUrl = `${siteUrl}/auth/callback`
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })

      if (error) {
        setMessage(error.message)
        setSentEmail(false)
      } else {
        setSentEmail(true)
        setMessage('Magic link sent! Check your email inbox.')
      }
    } catch {
      setMessage('An error occurred. Please try again.')
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
          Email address
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
            Sending magic link...
          </div>
        ) : (
          'Send Magic Link'
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
  const renderSuccessMessage = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="p-4 rounded-xl text-sm bg-green-500/10 text-green-400 border border-green-500/20">
        {message}
      </div>
      <div className="text-gray-300 text-sm">
        <p>Please check your email at <span className="font-medium">{email}</span> for the magic link.</p>
        <p className="mt-2">Click the link to sign in automatically.</p>
      </div>
    </div>
  )

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
      {!sentEmail ? renderLoginForm() : renderSuccessMessage()}
    </div>
  )
}
