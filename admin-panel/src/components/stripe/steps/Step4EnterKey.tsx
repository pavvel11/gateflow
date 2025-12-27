'use client'

import { useState, useEffect } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { useStripeConfig } from '../context/StripeConfigContext'
import { useTranslations } from 'next-intl'
import { validateStripeKey, saveStripeConfig } from '@/lib/actions/stripe-config'

export function Step4EnterKey() {
  const t = useTranslations('stripe.wizard.step4')
  const { state, setApiKey, setValidationStatus, setValidationResult, nextStep, previousStep } =
    useStripeConfig()

  const [showKey, setShowKey] = useState(false)
  const [localKey, setLocalKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Auto-trim on paste
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text').trim()
    setLocalKey(pastedText)
    setApiKey(pastedText)
  }

  // Auto-trim on blur
  const handleBlur = () => {
    const trimmed = localKey.trim()
    if (trimmed !== localKey) {
      setLocalKey(trimmed)
      setApiKey(trimmed)
    }
  }

  // Validate on input change (debounced format validation only)
  useEffect(() => {
    if (!localKey) {
      setValidationResult(null)
      setValidationStatus('idle')
      return
    }

    // Quick format check
    const timeout = setTimeout(() => {
      if (localKey.length < 30) {
        setValidationResult({
          isValid: false,
          formatValidation: {
            isValid: false,
            errors: ['API key is too short (minimum 30 characters)'],
          },
        })
      } else if (
        !localKey.startsWith('rk_test_') &&
        !localKey.startsWith('rk_live_') &&
        !localKey.startsWith('sk_test_') &&
        !localKey.startsWith('sk_live_')
      ) {
        setValidationResult({
          isValid: false,
          formatValidation: {
            isValid: false,
            errors: ['Invalid key prefix. Must start with rk_test_, rk_live_, sk_test_, or sk_live_'],
          },
        })
      } else {
        setValidationResult(null)
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [localKey, setValidationResult, setValidationStatus])

  // Full validation
  const handleValidate = async () => {
    if (!localKey || !state.mode) return

    setValidationStatus('validating')

    try {
      const result = await validateStripeKey(localKey, state.mode)

      if (!result.success) {
        setValidationStatus('error')
        setValidationResult({
          isValid: false,
          formatValidation: {
            isValid: false,
            errors: [result.error || 'Validation failed'],
          },
        })
        return
      }

      setValidationResult(result.data!)
      setValidationStatus(result.data!.isValid ? 'success' : 'error')
    } catch (error) {
      setValidationStatus('error')
      setValidationResult({
        isValid: false,
        formatValidation: {
          isValid: false,
          errors: ['Failed to validate key. Please try again.'],
        },
      })
    }
  }

  // Save and continue
  const handleSaveAndContinue = async () => {
    if (!state.mode || !localKey) return

    setIsSaving(true)

    try {
      const result = await saveStripeConfig({
        mode: state.mode,
        apiKey: localKey,
      })

      if (!result.success) {
        setValidationStatus('error')
        setValidationResult({
          isValid: false,
          formatValidation: {
            isValid: false,
            errors: [result.error || 'Failed to save configuration'],
          },
        })
        setIsSaving(false)
        return
      }

      // Success - move to next step
      nextStep()
    } catch (error) {
      setValidationStatus('error')
      setValidationResult({
        isValid: false,
        formatValidation: {
          isValid: false,
          errors: ['Failed to save configuration. Please try again.'],
        },
      })
    } finally {
      setIsSaving(false)
    }
  }

  const isValidFormat =
    localKey.length >= 30 &&
    (localKey.startsWith('rk_test_') ||
      localKey.startsWith('rk_live_') ||
      localKey.startsWith('sk_test_') ||
      localKey.startsWith('sk_live_'))

  const canValidate = isValidFormat && state.validationStatus === 'idle'
  const canSave = state.validationStatus === 'success' && state.validationResult?.isValid

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('title', { defaultValue: 'Enter Your API Key' })}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('subtitle', {
            defaultValue: 'Paste the Restricted API Key you created in Stripe',
          })}
        </p>
      </div>

      {/* Key Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('input.label', { defaultValue: 'Stripe API Key' })}
          <span className="text-red-600 ml-1">*</span>
        </label>
        <div className="relative">
          <textarea
            value={localKey}
            onChange={(e) => {
              setLocalKey(e.target.value)
              setApiKey(e.target.value)
            }}
            onPaste={handlePaste}
            onBlur={handleBlur}
            placeholder={t('input.placeholder', {
              defaultValue: state.mode === 'test' ? 'rk_test_...' : 'rk_live_...',
            })}
            className={`w-full px-4 py-3 pr-12 border rounded-lg font-mono text-sm resize-none ${
              state.validationStatus === 'success'
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                : state.validationStatus === 'error'
                  ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            } text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent`}
            rows={3}
            style={{
              fontFamily: 'monospace',
              WebkitTextSecurity: showKey ? 'none' : 'disc'
            } as React.CSSProperties}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            type="button"
          >
            {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {t('input.help', {
            defaultValue: 'Your key will be encrypted with AES-256-GCM before being stored.',
          })}
        </p>
      </div>

      {/* Format Errors */}
      {state.validationResult &&
        !state.validationResult.formatValidation.isValid &&
        state.validationResult.formatValidation.errors.length > 0 && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('errors.format.title', { defaultValue: 'Invalid Format' })}
                </p>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {state.validationResult.formatValidation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

      {/* Connection Test Result */}
      {state.validationResult?.connectionTest && !state.validationResult.connectionTest.success && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {t('errors.connection.title', { defaultValue: 'Connection Failed' })}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {state.validationResult.connectionTest.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Permission Verification Result */}
      {state.validationResult?.permissionVerification &&
        !state.validationResult.permissionVerification.allGranted && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  {t('errors.permissions.title', {
                    defaultValue: 'Missing Required Permissions',
                  })}
                </p>
                <div className="space-y-2">
                  {state.validationResult.permissionVerification.missingPermissions.map(
                    (perm, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>
                          {perm.resource} - {perm.operation}
                        </span>
                        {perm.errorMessage && (
                          <span className="text-xs text-gray-500">({perm.errorMessage})</span>
                        )}
                      </div>
                    )
                  )}
                </div>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  {t('errors.permissions.help', {
                    defaultValue: 'Go back to Stripe and update your key permissions.',
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Success State */}
      {state.validationStatus === 'success' && state.validationResult?.isValid && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {t('success.title', { defaultValue: 'API Key Validated Successfully!' })}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t('success.description', {
                  defaultValue:
                    'Your key has been verified and all required permissions are granted.',
                })}
              </p>
              {state.validationResult.connectionTest?.accountId && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Connected to: {state.validationResult.connectionTest.accountId}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validate Button */}
      {state.validationStatus !== 'success' && (
        <div className="mb-8">
          <button
            onClick={handleValidate}
            disabled={!canValidate || state.validationStatus === 'validating'}
            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              canValidate && state.validationStatus !== 'validating'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {state.validationStatus === 'validating' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('validateButton.validating', { defaultValue: 'Validating...' })}
              </>
            ) : (
              t('validateButton.validate', { defaultValue: 'Validate API Key' })
            )}
          </button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={previousStep}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          disabled={isSaving}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backButton', { defaultValue: 'Back' })}
        </button>

        <button
          onClick={handleSaveAndContinue}
          disabled={!canSave || isSaving}
          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-colors ${
            canSave && !isSaving
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('saveButton.saving', { defaultValue: 'Saving...' })}
            </>
          ) : (
            <>
              {t('saveButton.save', { defaultValue: 'Save & Complete' })}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
