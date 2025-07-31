'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface AppConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  stripePublishableKey: string
  cloudflareSiteKey: string
  siteUrl: string
}

const ConfigContext = createContext<AppConfig | null>(null)

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    fetch('/api/runtime-config')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load config: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        setConfig(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div>Loading configuration...</div>
  }

  if (error) {
    return <div>Error loading configuration: {error}</div>
  }

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  )
}

export const useConfig = () => {
  const context = useContext(ConfigContext)
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider')
  }
  return context
}
