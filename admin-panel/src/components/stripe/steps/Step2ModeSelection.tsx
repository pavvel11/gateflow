'use client'

import { TestTube, Rocket, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react'
import { useStripeConfig } from '../context/StripeConfigContext'
import { useTranslations } from 'next-intl'
import type { StripeMode } from '@/types/stripe-config'

export function Step2ModeSelection() {
  const t = useTranslations('stripe.wizard.step2')
  const { state, setMode, nextStep, previousStep } = useStripeConfig()

  const handleSelectMode = (mode: StripeMode) => {
    setMode(mode)
  }

  const handleNext = () => {
    if (!state.mode) return
    nextStep()
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('title', { defaultValue: 'Choose Environment Mode' })}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('subtitle', {
            defaultValue: 'Select whether you want to configure Test or Live mode',
          })}
        </p>
      </div>

      {/* Mode Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Test Mode */}
        <button
          onClick={() => handleSelectMode('test')}
          className={`group relative p-6 rounded-xl border-2 transition-all text-left ${
            state.mode === 'test'
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-lg'
              : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                state.mode === 'test'
                  ? 'bg-orange-100 dark:bg-orange-900/50'
                  : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/30'
              }`}
            >
              <TestTube
                className={`w-6 h-6 ${state.mode === 'test' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400 group-hover:text-orange-500'}`}
              />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('test.title', { defaultValue: 'Test Mode' })}
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200">
                  {t('test.badge', { defaultValue: 'Recommended First' })}
                </span>
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('test.description', {
                  defaultValue:
                    'Use test mode to safely practice and verify your integration without processing real payments.',
                })}
              </p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  {t('test.benefit1', { defaultValue: 'No real money involved' })}
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  {t('test.benefit2', { defaultValue: 'Test with fake card numbers' })}
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  {t('test.benefit3', { defaultValue: 'Perfect for development' })}
                </li>
              </ul>
            </div>
          </div>
          {state.mode === 'test' && (
            <div className="absolute top-3 right-3">
              <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
          )}
        </button>

        {/* Live Mode */}
        <button
          onClick={() => handleSelectMode('live')}
          className={`group relative p-6 rounded-xl border-2 transition-all text-left ${
            state.mode === 'live'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg'
              : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                state.mode === 'live'
                  ? 'bg-green-100 dark:bg-green-900/50'
                  : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-green-50 dark:group-hover:bg-green-900/30'
              }`}
            >
              <Rocket
                className={`w-6 h-6 ${state.mode === 'live' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400 group-hover:text-green-500'}`}
              />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('live.title', { defaultValue: 'Live Mode' })}
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">
                  {t('live.badge', { defaultValue: 'Production' })}
                </span>
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('live.description', {
                  defaultValue:
                    'Use live mode for your production environment to accept real payments from customers.',
                })}
              </p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  {t('live.benefit1', { defaultValue: 'Real customer payments' })}
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  {t('live.benefit2', { defaultValue: 'Production-ready' })}
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  {t('live.benefit3', { defaultValue: 'Requires verified Stripe account' })}
                </li>
              </ul>
            </div>
          </div>
          {state.mode === 'live' && (
            <div className="absolute top-3 right-3">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-8 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <p className="text-gray-900 dark:text-white font-medium mb-1">
              {t('info.title', { defaultValue: 'You can configure both later' })}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              {t('info.description', {
                defaultValue:
                  'You can set up both Test and Live mode separately. Start with Test mode to practice, then add Live mode when ready for production.',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={previousStep}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backButton', { defaultValue: 'Back' })}
        </button>

        <button
          onClick={handleNext}
          disabled={!state.mode}
          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-colors ${
            state.mode
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {t('nextButton', { defaultValue: 'Continue' })}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
