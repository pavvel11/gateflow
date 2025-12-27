'use client'

import { useState, useEffect } from 'react'
import { Shield, ExternalLink, Settings, CheckCircle2, AlertCircle } from 'lucide-react'
import { StripeConfigWizard } from '@/components/stripe/StripeConfigWizard'
import { listStripeConfigs } from '@/lib/actions/stripe-config'
import { isUsingEnvConfig } from '@/lib/stripe/server'
import type { StripeConfiguration } from '@/types/stripe-config'
import { useTranslations } from 'next-intl'

export default function StripeSettings() {
  const t = useTranslations('settings.stripe')
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [configs, setConfigs] = useState<StripeConfiguration[]>([])
  const [usingEnv, setUsingEnv] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadConfigs = async () => {
    setLoading(true)
    try {
      const [configsResult, envConfigStatus] = await Promise.all([
        listStripeConfigs(),
        isUsingEnvConfig(),
      ])

      if (configsResult.success && configsResult.data) {
        setConfigs(configsResult.data)
      }
      setUsingEnv(envConfigStatus)
    } catch (error) {
      console.error('Failed to load Stripe configs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  const activeConfigs = configs.filter((c) => c.is_active)

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('subtitle')}
            </p>
          </div>
          <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Configuration Method Info Banner */}
        {usingEnv ? (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {t('currentMethod.env.title')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {t('currentMethod.env.description')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('currentMethod.env.alternative')}
                </p>
              </div>
            </div>
          </div>
        ) : activeConfigs.length > 0 ? (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {t('currentMethod.database.title')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {t('currentMethod.database.description')}
                </p>
                <div className="space-y-2">
                  {activeConfigs.map((config) => (
                    <div
                      key={config.id}
                      className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400"
                    >
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
                          config.mode === 'test'
                            ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200'
                            : 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                        }`}
                      >
                        {config.mode === 'test' ? '🧪 Test' : '🚀 Live'}
                      </span>
                      <span className="font-mono">{config.key_prefix}****{config.key_last_4}</span>
                      {config.permissions_verified && (
                        <span className="text-green-600 dark:text-green-400">✓ Verified</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  {t('currentMethod.database.alternative')}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Active Configurations */}
        {activeConfigs.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('activeConfigs')}
            </h3>
            {activeConfigs.map((config) => (
              <div
                key={config.id}
                className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          config.mode === 'test'
                            ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200'
                            : 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                        }`}
                      >
                        {t(`mode.${config.mode}`)}
                      </span>
                      {config.permissions_verified && (
                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('verified')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                      {config.key_prefix}****{config.key_last_4}
                    </p>
                    {config.account_id && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('account')}: {config.account_id}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('created')}: {new Date(config.created_at).toLocaleDateString()}
                      {config.expires_at && (
                        <span className="ml-2">
                          • {t('rotationReminder')}:{' '}
                          {new Date(config.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            {activeConfigs.length > 0 ? t('configureAnother') : t('configureButton')}
          </button>

          <a
            href="https://dashboard.stripe.com/settings/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('openDashboard')}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {t('infoBox.title')}
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>{t('infoBox.method1')}</li>
            <li>{t('infoBox.method2')}</li>
            <li className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t('infoBox.footer')}
            </li>
          </ul>
        </div>
      </div>

      {/* Wizard Modal */}
      {isWizardOpen && (
        <StripeConfigWizard
          onClose={() => setIsWizardOpen(false)}
          onComplete={() => {
            setIsWizardOpen(false)
            loadConfigs() // Reload configurations
          }}
        />
      )}
    </>
  )
}
