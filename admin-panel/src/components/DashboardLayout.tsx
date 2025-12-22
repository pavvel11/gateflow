'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import LanguageSwitcher from './LanguageSwitcher'

interface DashboardLayoutProps {
  children: React.ReactNode
  user?: {
    email: string
    id: string
  } | null
  isAdmin?: boolean
}

export default function DashboardLayout({ children, user, isAdmin: isAdminProp }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const { signOut, isAdmin: isAdminContext } = useAuth()
  const t = useTranslations('navigation')

  // Use prop if provided (from server), otherwise fallback to context (client)
  const isAdmin = isAdminProp !== undefined ? isAdminProp : isAdminContext

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
                  GateFlow
                </span>
              </div>
              
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                {user ? (
                  <>
                    {isAdmin && (
                      <>
                        <Link
                          href="/dashboard"
                          className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          {t('dashboard')}
                        </Link>
                        <Link
                          href="/dashboard/products"
                          className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          {t('products')}
                        </Link>
                        <Link
                          href="/dashboard/order-bumps"
                          className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          {t('orderBumps')}
                        </Link>
                        <Link
                          href="/dashboard/coupons"
                          className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          {t('coupons')}
                        </Link>
                        <Link
                          href="/dashboard/webhooks"
                          className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          {t('webhooks')}
                        </Link>
                        <Link
                          href="/dashboard/users"
                          className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          {t('users')}
                        </Link>
                      </>
                    )}
                    <Link
                      href="/my-products"
                      className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {t('myProducts')}
                    </Link>
                  </>
                ) : null}
                <Link
                  href="/products"
                  className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {t('store')}
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-2 rounded-md transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
              
              {/* User menu or login button */}
              {user ? (
                <div className="hidden md:block relative">
                  {/* Overlay to close user menu */}
                  {isUserMenuOpen && (
                    <div
                      className="fixed inset-0 z-[55]"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                  )}
                  
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-[60]">
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
                          {user.email}
                        </div>
                        <div className="border-b border-gray-200 dark:border-gray-700">
                          <LanguageSwitcher />
                        </div>
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          {t('logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  {t('login')}
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-gray-800">
              {user ? (
                <>
                  {isAdmin && (
                    <>
                      <Link
                        href="/dashboard"
                        className="block px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {t('dashboard')}
                      </Link>
                      <Link
                        href="/dashboard/products"
                        className="block px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {t('products')}
                      </Link>
                      <Link
                        href="/dashboard/order-bumps"
                        className="block px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {t('orderBumps')}
                      </Link>
                      <Link
                        href="/dashboard/coupons"
                        className="block px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {t('coupons')}
                      </Link>
                      <Link
                        href="/dashboard/webhooks"
                        className="block px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {t('webhooks')}
                      </Link>
                      <Link
                        href="/dashboard/users"
                        className="block px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {t('users')}
                      </Link>
                    </>
                  )}
                  <Link
                    href="/my-products"
                    className="block px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('myProducts')}
                  </Link>
                </>
              ) : null}
              <Link
                href="/products"
                className="block px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('store')}
              </Link>
              
              {/* Mobile user section */}
              {user ? (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </div>
                  <div className="px-3 py-2">
                    <LanguageSwitcher />
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    {t('logout')}
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    href="/login"
                    className="block mx-3 px-3 py-2 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white text-center rounded-md transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('login')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  )
}
