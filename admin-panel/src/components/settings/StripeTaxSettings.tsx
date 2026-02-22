'use client'

import { useState, useEffect } from 'react'
import {
  Receipt,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react'
import { getStripeTaxStatus, getCheckoutConfigAction } from '@/lib/actions/stripe-tax'
import type { StripeTaxStatus } from '@/lib/actions/stripe-tax'
import type { ConfigSource } from '@/lib/stripe/checkout-config'
import { getShopConfig, updateShopConfig } from '@/lib/actions/shop-config'
import { useToast } from '@/contexts/ToastContext'
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

function SourceBadge({ source }: { source: ConfigSource }) {
  const t = useTranslations('settings.stripeTax.toggles')
  const styles: Record<ConfigSource, string> = {
    db: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    env: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  }
  const labels: Record<ConfigSource, string> = {
    db: t('sourceDb'),
    env: t('sourceEnv'),
    default: t('sourceDefault'),
  }
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${styles[source]}`}>
      {labels[source]}
    </span>
  )
}

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean
  onChange: (value: boolean) => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function StripeTaxSettings() {
  const t = useTranslations('settings.stripeTax')
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [taxStatus, setTaxStatus] = useState<StripeTaxStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Toggle state
  const [automaticTax, setAutomaticTax] = useState(true)
  const [taxIdCollection, setTaxIdCollection] = useState(true)
  const [billingAddress, setBillingAddress] = useState<'auto' | 'required'>('auto')
  const [expiresHours, setExpiresHours] = useState(24)
  const [collectTerms, setCollectTerms] = useState(false)
  const [sources, setSources] = useState({
    automatic_tax: 'default' as ConfigSource,
    tax_id_collection: 'default' as ConfigSource,
    billing_address_collection: 'default' as ConfigSource,
    expires_hours: 'default' as ConfigSource,
    collect_terms: 'default' as ConfigSource,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [statusResult, configResult] = await Promise.all([
          getStripeTaxStatus(),
          getCheckoutConfigAction(),
        ])

        if (statusResult.success && statusResult.data) {
          setTaxStatus(statusResult.data)
        } else {
          setError(statusResult.error || 'Unknown error')
        }

        if (configResult.success && configResult.data) {
          setAutomaticTax(configResult.data.automatic_tax.enabled)
          setTaxIdCollection(configResult.data.tax_id_collection.enabled)
          setBillingAddress(configResult.data.billing_address_collection)
          setExpiresHours(configResult.data.expires_hours)
          setCollectTerms(configResult.data.collect_terms_of_service)
          setSources({
            automatic_tax: configResult.data.sources.automatic_tax,
            tax_id_collection: configResult.data.sources.tax_id_collection,
            billing_address_collection: configResult.data.sources.billing_address_collection,
            expires_hours: configResult.data.sources.expires_hours,
            collect_terms: configResult.data.sources.collect_terms,
          })
        }
      } catch (err) {
        setError('Failed to load tax status')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleToggle = async (
    field: 'automatic_tax_enabled' | 'tax_id_collection_enabled' | 'checkout_collect_terms',
    value: boolean,
  ) => {
    setSaving(true)
    try {
      const success = await updateShopConfig({ [field]: value })
      if (success) {
        if (field === 'automatic_tax_enabled') {
          setAutomaticTax(value)
          setSources((s) => ({ ...s, automatic_tax: 'db' }))
        } else if (field === 'tax_id_collection_enabled') {
          setTaxIdCollection(value)
          setSources((s) => ({ ...s, tax_id_collection: 'db' }))
        } else {
          setCollectTerms(value)
          setSources((s) => ({ ...s, collect_terms: 'db' }))
        }
        addToast(t('saveSuccess'), 'success')
      } else {
        addToast(t('saveError'), 'error')
      }
    } catch {
      addToast(t('saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleBillingAddress = async (value: 'auto' | 'required') => {
    setSaving(true)
    try {
      const success = await updateShopConfig({ checkout_billing_address: value })
      if (success) {
        setBillingAddress(value)
        setSources((s) => ({ ...s, billing_address_collection: 'db' }))
        addToast(t('saveSuccess'), 'success')
      } else {
        addToast(t('saveError'), 'error')
      }
    } catch {
      addToast(t('saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleExpiresHours = async (value: number) => {
    const clamped = Math.min(168, Math.max(1, value))
    setSaving(true)
    try {
      const success = await updateShopConfig({ checkout_expires_hours: clamped })
      if (success) {
        setExpiresHours(clamped)
        setSources((s) => ({ ...s, expires_hours: 'db' }))
        addToast(t('saveSuccess'), 'success')
      } else {
        addToast(t('saveError'), 'error')
      }
    } catch {
      addToast(t('saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

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

      {/* Checkout Settings Toggles */}
      <div className="mb-6 space-y-0">
        {/* Automatic Tax */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('toggles.automaticTax')}
              </p>
              <SourceBadge source={sources.automatic_tax} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('toggles.automaticTaxDescription')}
            </p>
          </div>
          <Toggle
            enabled={automaticTax}
            onChange={(v) => handleToggle('automatic_tax_enabled', v)}
            disabled={saving}
          />
        </div>

        {/* Tax ID Collection */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('toggles.taxIdCollection')}
              </p>
              <SourceBadge source={sources.tax_id_collection} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('toggles.taxIdCollectionDescription')}
            </p>
          </div>
          <Toggle
            enabled={taxIdCollection}
            onChange={(v) => handleToggle('tax_id_collection_enabled', v)}
            disabled={saving}
          />
        </div>

        {/* Billing Address */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('toggles.billingAddress')}
              </p>
              <SourceBadge source={sources.billing_address_collection} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('toggles.billingAddressDescription')}
            </p>
          </div>
          <div className="flex gap-1">
            {(['auto', 'required'] as const).map((value) => (
              <button
                key={value}
                onClick={() => handleBillingAddress(value)}
                disabled={saving}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  billingAddress === value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {t(`toggles.billing${value.charAt(0).toUpperCase() + value.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Session Expires Hours */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('toggles.expiresHours')}
              </p>
              <SourceBadge source={sources.expires_hours} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('toggles.expiresHoursDescription')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={168}
              value={expiresHours}
              onChange={(e) => setExpiresHours(Number(e.target.value))}
              onBlur={() => handleExpiresHours(expiresHours)}
              disabled={saving}
              className={`w-20 px-2 py-1.5 text-sm text-right rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('toggles.expiresHoursSuffix')}
            </span>
          </div>
        </div>

        {/* Terms of Service Collection */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('toggles.collectTerms')}
              </p>
              <SourceBadge source={sources.collect_terms} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('toggles.collectTermsDescription')}
            </p>
          </div>
          <Toggle
            enabled={collectTerms}
            onChange={(v) => handleToggle('checkout_collect_terms', v)}
            disabled={saving}
          />
        </div>
      </div>

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
