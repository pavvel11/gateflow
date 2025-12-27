'use client'

import { Shield, Lock, Key, CheckCircle2, ArrowRight } from 'lucide-react'
import { useStripeConfig } from '../context/StripeConfigContext'
import { useTranslations } from 'next-intl'

export function Step1Welcome() {
  const t = useTranslations('stripe.wizard.step1')
  const { nextStep } = useStripeConfig()

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
          <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('title', { defaultValue: 'Secure Stripe Integration' })}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('subtitle', {
            defaultValue:
              'Configure your Stripe API keys using Restricted API Keys (RAK) for maximum security',
          })}
        </p>
      </div>

      {/* What are RAKs */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Key className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('whatIsRAK.title', { defaultValue: 'What are Restricted API Keys?' })}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {t('whatIsRAK.description', {
                defaultValue:
                  'Restricted API Keys (RAK) allow you to grant specific permissions to your application, following the principle of least privilege. Instead of using full access keys, you only grant the permissions GateFlow actually needs.',
              })}
            </p>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <strong>{t('whatIsRAK.recommended', { defaultValue: 'Recommended by Stripe' })}</strong>{' '}
              {t('whatIsRAK.recommendedText', {
                defaultValue: 'for self-hosted integrations and production environments.',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-3 mb-8">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
          {t('benefits.title', { defaultValue: 'Why use this wizard?' })}
        </h4>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t('benefits.encrypted.title', { defaultValue: 'Encrypted Storage' })}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('benefits.encrypted.description', {
                defaultValue: 'Your API keys are encrypted with AES-256-GCM before being stored in the database.',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t('benefits.guided.title', { defaultValue: 'Guided Setup' })}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('benefits.guided.description', {
                defaultValue:
                  'Step-by-step instructions with visual guides to create your Restricted API Key in Stripe.',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t('benefits.validation.title', { defaultValue: 'Automatic Validation' })}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('benefits.validation.description', {
                defaultValue:
                  'We automatically test your key and verify it has all required permissions.',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t('benefits.rotation.title', { defaultValue: 'Key Rotation Reminders' })}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('benefits.rotation.description', {
                defaultValue:
                  'Get reminded every 90 days to rotate your keys for security best practices.',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Alternative Method */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {t('alternative.title', { defaultValue: 'Alternative: .env Configuration' })}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('alternative.description', {
                defaultValue:
                  'Developers can also configure Stripe by setting STRIPE_SECRET_KEY directly in .env file. Both methods are equally supported.',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Time Estimate */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
        ⏱️ {t('timeEstimate', { defaultValue: 'Estimated time: 5-10 minutes' })}
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={nextStep}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('startButton', { defaultValue: 'Start Configuration' })}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
