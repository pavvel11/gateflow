'use client'

import { useEffect, useState } from 'react'

interface AuthStatusResponse {
  authenticated: boolean
  user?: {
    id: string
    email: string | null
    lastSignIn: string | null
  }
  adminStatus?: {
    isAdminViaRPC: boolean
    isAdminViaTable: boolean
  }
  message?: string
}

export default function AuthDebugPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/debug-auth')
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || 'Failed to fetch auth status')
        }
        
        const data = await response.json()
        setAuthStatus(data)
        setError(null)
      } catch (err) {
        console.error('Auth debug error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [])
  
  return (
    <div className="max-w-4xl mx-auto p-6 mt-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      {loading && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-1 text-sm text-red-700">{error}</div>
        </div>
      )}
      
      {!loading && !error && authStatus && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Authentication Status</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                  {authStatus.authenticated ? 'Authenticated' : 'Not Authenticated'}
                </span>
              </div>
              
              {authStatus.authenticated && authStatus.user && (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{authStatus.user.email}</dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">User ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{authStatus.user.id}</dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Sign In</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {authStatus.user.lastSignIn ? new Date(authStatus.user.lastSignIn).toLocaleString() : 'N/A'}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
          
          {authStatus.authenticated && authStatus.adminStatus && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Admin Status</h3>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    authStatus.adminStatus.isAdminViaRPC && authStatus.adminStatus.isAdminViaTable
                      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                      : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                  }`}>
                    {authStatus.adminStatus.isAdminViaRPC && authStatus.adminStatus.isAdminViaTable
                      ? 'Admin Access Confirmed'
                      : 'Not an Admin'}
                  </span>
                </div>
                
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Via RPC Function (is_admin)</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {authStatus.adminStatus.isAdminViaRPC ? '✅ Yes' : '❌ No'}
                    </dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Via Database Table (admin_users)</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {authStatus.adminStatus.isAdminViaTable ? '✅ Yes' : '❌ No'}
                    </dd>
                  </div>
                </dl>
                
                {(!authStatus.adminStatus.isAdminViaRPC || !authStatus.adminStatus.isAdminViaTable) && (
                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-md">
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Admin access issue detected</h4>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-200">
                      Your account is not properly configured as an admin. This is likely why you cannot access the dashboard pages.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Troubleshooting</h3>
            </div>
            <div className="p-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quick Fix</h4>
              
              {authStatus.authenticated && (
                <div>
                  <button
                    onClick={async () => {
                      try {
                        setLoading(true)
                        const response = await fetch('/api/make-admin', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          }
                        })
                        
                        const result = await response.json()
                        
                        if (response.ok) {
                          alert(result.message)
                          // Refresh auth status
                          window.location.reload()
                        } else {
                          alert(`Error: ${result.details || result.error || 'Unknown error'}`)
                        }
                      } catch (err) {
                        alert('Failed to make user an admin: ' + (err instanceof Error ? err.message : 'Unknown error'))
                      } finally {
                        setLoading(false)
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors mb-4"
                    disabled={loading}
                  >
                    Make Me Admin
                  </button>
                  
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                    Click the button above to make yourself an admin. If that doesn&apos;t work, you can manually run the following SQL:
                  </p>
                  
                  <pre className="p-3 bg-gray-100 dark:bg-gray-900 rounded-md overflow-x-auto text-xs font-mono mb-4">
                    {`INSERT INTO admin_users (user_id) VALUES ('${authStatus.user?.id || "YOUR_USER_ID_HERE"}');`}
                  </pre>
                </div>
              )}
              
              {!authStatus.authenticated && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Please log in first to use the admin fix.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
