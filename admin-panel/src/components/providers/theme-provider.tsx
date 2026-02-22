'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  cycleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'gf_theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

interface ThemeProviderProps {
  children: React.ReactNode
  adminTheme?: string
}

export function ThemeProvider({ children, adminTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')

  // Initialize from localStorage, falling back to admin theme from shop config
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    const hasUserPreference = stored && ['light', 'dark', 'system'].includes(stored)

    let initial: Theme
    if (hasUserPreference) {
      initial = stored
    } else if (adminTheme && ['light', 'dark', 'system'].includes(adminTheme)) {
      initial = adminTheme as Theme
    } else {
      initial = 'system'
    }

    setThemeState(initial)

    const resolved = initial === 'system' ? getSystemTheme() : initial
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [adminTheme])

  // Listen for OS theme changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') {
        const resolved = getSystemTheme()
        setResolvedTheme(resolved)
        applyTheme(resolved)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme
    setResolvedTheme(resolved)
    applyTheme(resolved)
    window.dispatchEvent(new CustomEvent('gf-theme-change', { detail: newTheme }))
  }, [])

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ['system', 'light', 'dark']
    const next = order[(order.indexOf(theme) + 1) % order.length]
    setTheme(next)
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

/**
 * Inline script to prevent FOUC — inject into <head> before React hydration.
 * Reads localStorage and applies .dark class immediately.
 * Falls back to adminTheme from shop config when no user preference exists.
 */
export function ThemeScript({ adminTheme }: { adminTheme?: string }) {
  const script = `
    (function() {
      try {
        var t = localStorage.getItem('${STORAGE_KEY}');
        var admin = ${JSON.stringify(adminTheme || null)};
        if (t === 'dark' || t === 'light') {
          if (t === 'dark') document.documentElement.classList.add('dark');
        } else if (admin === 'dark' || admin === 'light') {
          if (admin === 'dark') document.documentElement.classList.add('dark');
        } else {
          if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
        }
      } catch(e) {}
    })();
  `
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
