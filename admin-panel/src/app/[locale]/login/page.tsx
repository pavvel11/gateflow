'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import LoginForm from '@/components/LoginForm'
import FloatingLanguageSwitcher from '@/components/FloatingLanguageSwitcher'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations()
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'disposable_email') {
      setErrorMessage('Registration blocked: Disposable email addresses are not allowed. Please use a permanent email address.')
    }
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-white text-lg">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Floating Language Switcher */}
      <FloatingLanguageSwitcher position="top-right" variant="discrete" />
      
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">GateFlow Admin</h1>
          <p className="text-gray-300">{t('auth.pleaseSignIn')}</p>
          
          {errorMessage && (
            <div className="mt-4 p-4 rounded-xl text-sm bg-red-500/10 text-red-400 border border-red-500/20">
              {errorMessage}
            </div>
          )}
        </div>
        
        <LoginForm />
      </div>
    </div>
  )
}
