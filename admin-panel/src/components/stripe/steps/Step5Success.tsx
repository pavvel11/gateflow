'use client'

import { CheckCircle2, Sparkles, ExternalLink, RotateCcw } from 'lucide-react'
import { useStripeConfig } from '../context/StripeConfigContext'
import { useTranslations } from 'next-intl'

interface Step5SuccessProps {
  onComplete: () => void
}

export function Step5Success({ onComplete }: Step5SuccessProps) {
  const t = useTranslations('stripe.wizard.step5')
  const { state } = useStripeConfig()

  const isTestMode = state.mode === 'test'

  return (
    <div className="max-w-2xl mx-auto text-center">
      {/* Success Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>

      {/* Title */}
      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
        {t('title', { defaultValue: 'Configuration Complete!' })}
      </h3>

      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        {t('subtitle', {
          defaultValue: 'Your Stripe integration is now configured and ready to use',
        })}
      </p>

      {/* Summary Cards */}
      <div className="space-y-4 mb-10">
        {/* Mode Card */}
        <div
          className={`rounded-lg p-5 border-2 ${
            isTestMode
              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('summary.mode', { defaultValue: 'Configured Mode' })}
              </p>
              <p
                className={`text-lg font-semibold ${isTestMode ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300'}`}
              >
                {isTestMode
                  ? t('summary.test', { defaultValue: 'Test Mode 🧪' })
                  : t('summary.live', { defaultValue: 'Live Mode 🚀' })}
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${isTestMode ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200' : 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'}`}
            >
              {t('summary.active', { defaultValue: 'Active' })}
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {t('security.title', { defaultValue: 'Encrypted & Secure' })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('security.description', {
                  defaultValue:
                    'Your API key has been encrypted with AES-256-GCM and securely stored in the database.',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Rotation Reminder Card */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {t('rotation.title', { defaultValue: 'Rotation Reminder Set' })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('rotation.description', {
                  defaultValue:
                    "You'll receive a reminder in 90 days to rotate your API key as a security best practice.",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      {isTestMode && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 mb-8 border border-yellow-200 dark:border-yellow-800 text-left">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            {t('nextSteps.title', { defaultValue: '💡 Next Steps' })}
          </h4>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 dark:text-yellow-400">1.</span>
              <span>
                {t('nextSteps.test', {
                  defaultValue: 'Test your integration with Stripe test card numbers',
                })}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 dark:text-yellow-400">2.</span>
              <span>
                {t('nextSteps.verify', {
                  defaultValue: 'Verify that payments are processing correctly in test mode',
                })}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 dark:text-yellow-400">3.</span>
              <span>
                {t('nextSteps.live', {
                  defaultValue:
                    'When ready for production, configure Live mode using the same wizard',
                })}
              </span>
            </li>
          </ul>
          <a
            href="https://stripe.com/docs/testing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('nextSteps.learnMore', { defaultValue: 'Learn about Stripe test cards' })}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {!isTestMode && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 mb-8 border border-green-200 dark:border-green-800 text-left">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            {t('live.title', { defaultValue: '🎉 You\'re Live!' })}
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {t('live.description', {
              defaultValue:
                'Your Stripe integration is now configured for production. You can accept real payments from customers.',
            })}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('live.reminder', {
              defaultValue:
                'Make sure you have properly configured your webhook endpoints and tested all payment flows.',
            })}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onComplete}
          className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
        >
          {t('doneButton', { defaultValue: 'Done' })}
        </button>

        <a
          href="https://dashboard.stripe.com/settings/billing"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {t('stripeButton', { defaultValue: 'Open Stripe Dashboard' })}
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Fine Print */}
      <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">
        {t('finePrint', {
          defaultValue:
            'You can always update or rotate your API keys from the Settings page.',
        })}
      </p>
    </div>
  )
}
