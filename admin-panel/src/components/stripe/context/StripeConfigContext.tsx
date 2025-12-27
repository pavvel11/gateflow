'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type {
  WizardState,
  WizardStep,
  StripeMode,
  ValidationResult,
} from '@/types/stripe-config'

interface StripeConfigContextType {
  state: WizardState
  goToStep: (step: WizardStep) => void
  nextStep: () => void
  previousStep: () => void
  setMode: (mode: StripeMode) => void
  setApiKey: (key: string) => void
  setValidationStatus: (status: WizardState['validationStatus']) => void
  setValidationResult: (result: ValidationResult | null) => void
  resetWizard: () => void
  saveDraft: () => void
  loadDraft: () => boolean
  clearDraft: () => void
}

const StripeConfigContext = createContext<StripeConfigContextType | undefined>(undefined)

const DRAFT_STORAGE_KEY = 'stripe-wizard-draft'
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

interface DraftData {
  currentStep: WizardStep
  mode: StripeMode | null
  timestamp: number
}

const initialState: WizardState = {
  currentStep: 1,
  mode: null,
  apiKey: '',
  validationStatus: 'idle',
  validationResult: null,
  isDirty: false,
}

export function StripeConfigProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState)

  // Save draft to localStorage (excluding sensitive apiKey)
  const saveDraft = useCallback(() => {
    if (typeof window === 'undefined') return

    const draft: DraftData = {
      currentStep: state.currentStep,
      mode: state.mode,
      timestamp: Date.now(),
    }

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch (error) {
      console.warn('Failed to save wizard draft:', error)
    }
  }, [state.currentStep, state.mode])

  // Load draft from localStorage
  const loadDraft = useCallback((): boolean => {
    if (typeof window === 'undefined') return false

    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!stored) return false

      const draft: DraftData = JSON.parse(stored)

      // Check if draft is expired
      const age = Date.now() - draft.timestamp
      if (age > DRAFT_EXPIRY_MS) {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        return false
      }

      // Restore state (but not apiKey for security)
      setState((prev) => ({
        ...prev,
        currentStep: draft.currentStep,
        mode: draft.mode,
        isDirty: true,
      }))

      return true
    } catch (error) {
      console.warn('Failed to load wizard draft:', error)
      return false
    }
  }, [])

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(DRAFT_STORAGE_KEY)
  }, [])

  // Auto-save draft when state changes
  useEffect(() => {
    if (state.isDirty) {
      saveDraft()
    }
  }, [state.isDirty, saveDraft])

  const goToStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, currentStep: step, isDirty: true }))
  }, [])

  const nextStep = useCallback(() => {
    setState((prev) => {
      const nextStep = Math.min(5, prev.currentStep + 1) as WizardStep
      return { ...prev, currentStep: nextStep, isDirty: true }
    })
  }, [])

  const previousStep = useCallback(() => {
    setState((prev) => {
      const prevStep = Math.max(1, prev.currentStep - 1) as WizardStep
      return { ...prev, currentStep: prevStep }
    })
  }, [])

  const setMode = useCallback((mode: StripeMode) => {
    setState((prev) => ({ ...prev, mode, isDirty: true }))
  }, [])

  const setApiKey = useCallback((key: string) => {
    setState((prev) => ({ ...prev, apiKey: key, isDirty: true }))
  }, [])

  const setValidationStatus = useCallback((status: WizardState['validationStatus']) => {
    setState((prev) => ({ ...prev, validationStatus: status }))
  }, [])

  const setValidationResult = useCallback((result: ValidationResult | null) => {
    setState((prev) => ({ ...prev, validationResult: result }))
  }, [])

  const resetWizard = useCallback(() => {
    setState(initialState)
    clearDraft()
  }, [clearDraft])

  const value: StripeConfigContextType = {
    state,
    goToStep,
    nextStep,
    previousStep,
    setMode,
    setApiKey,
    setValidationStatus,
    setValidationResult,
    resetWizard,
    saveDraft,
    loadDraft,
    clearDraft,
  }

  return <StripeConfigContext.Provider value={value}>{children}</StripeConfigContext.Provider>
}

export function useStripeConfig() {
  const context = useContext(StripeConfigContext)
  if (!context) {
    throw new Error('useStripeConfig must be used within StripeConfigProvider')
  }
  return context
}
