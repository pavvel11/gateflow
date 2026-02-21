'use client'

import { useState, useEffect } from 'react'
import {
  Receipt,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react'
import { getStripeTaxStatus } from '@/lib/actions/stripe-tax'
import type { StripeTaxStatus } from '@/lib/actions/stripe-tax'
import { useTranslations } from 'next-intl'

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', DE: 'Germany', FR: 'France',
  PL: 'Poland', NL: 'Netherlands', ES: 'Spain', IT: 'Italy', SE: 'Sweden',
  NO: 'Norway', DK: 'Denmark', FI: 'Finland', BE: 'Belgium', AT: 'Austria',
  CH: 'Switzerland', IE: 'Ireland', PT: 'Portugal', CZ: 'Czech Republic',
  RO: 'Romania', HU: 'Hungary', BG: 'Bulgaria', HR: 'Croatia', SK: 'Slovakia',
  SI: 'Slovenia', LT: 'Lithuania', LV: 'Latvia', EE: 'Estonia', MT: 'Malta',
  CY: 'Cyprus', LU: 'Luxembourg', GR: 'Greece', AU: 'Australia', NZ: 'New Zealand',
  CA: 'Canada', JP: 'Japan', SG: 'Singapore', KR: 'South Korea', IN: 'India',
  MX: 'Mexico', BR: 'Brazil', ZA: 'South Africa',
}

function getCountryFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] || code.toUpperCase()
}

const DASHBOARD_LINKS = [
  { key: 'taxSettings', url: 'https://dashboard.stripe.com/settings/tax' },
  { key: 'taxRegistrations', url: 'https://dashboard.stripe.com/tax/registrations' },
  { key: 'taxReports', url: 'https://dashboard.stripe.com/tax/reporting' },
] as const

export default function StripeTaxSettings() {
  const t = useTranslations('settings.stripeTax')
  const [loading, setLoading] = useState(true)
  const [taxStatus, setTaxStatus] = useState<StripeTaxStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const result = await getStripeTaxStatus()
        if (result.success && result.data) {
          setTaxStatus(result.data)
        } else {
          setError(result.error || 'Unknown error')
        }
      } catch (err) {
        setError('Failed to load tax status')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
        <Receipt className="w-8 h-8 text-blue-600 dark:text-blue-400" />
      </div>

      {/* Status Banner */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {taxStatus && (
        <>
          {taxStatus.status === 'active' && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {t('status.active')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('status.activeDescription')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {taxStatus.status === 'pending' && (
            <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {t('status.pending')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('status.pendingDescription')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {taxStatus.status === 'no_permission' && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {t('status.noPermission')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('status.noPermissionDescription')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {taxStatus.status === 'stripe_not_configured' && (
            <div className="mb-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {t('status.stripeNotConfigured')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('status.stripeNotConfiguredDescription')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Head Office */}
          {taxStatus.headOffice && taxStatus.headOffice.country && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('headOffice')}:{' '}
                {getCountryFlag(taxStatus.headOffice.country)}{' '}
                {getCountryName(taxStatus.headOffice.country)}
                {taxStatus.headOffice.state && `, ${taxStatus.headOffice.state}`}
              </p>
            </div>
          )}

          {/* Registrations */}
          {taxStatus.status !== 'stripe_not_configured' &&
            taxStatus.status !== 'no_permission' && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('registrations')}
                </h3>
                {taxStatus.registrations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {taxStatus.registrations.map((reg) => (
                      <span
                        key={`${reg.country}-${reg.state || ''}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {getCountryFlag(reg.country)}{' '}
                        {getCountryName(reg.country)}
                        {reg.state && ` (${reg.state})`}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('noRegistrations')}
                  </p>
                )}
              </div>
            )}
        </>
      )}

      {/* Dashboard Links */}
      <div className="flex flex-wrap gap-3">
        {DASHBOARD_LINKS.map((link) => (
          <a
            key={link.key}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            {t(`links.${link.key}`)}
            <ExternalLink className="w-4 h-4" />
          </a>
        ))}
      </div>
    </div>
  )
}
