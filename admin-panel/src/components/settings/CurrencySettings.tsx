'use client';

import { useState, useEffect } from 'react';
import { DollarSign, ExternalLink, CheckCircle2, AlertCircle, Loader2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { saveCurrencyConfig, getCurrencyConfig, deleteCurrencyConfig, type CurrencyConfig } from '@/lib/actions/currency-config';
import { getExchangeRates } from '@/lib/actions/currency';
import { getDefaultCurrency } from '@/lib/actions/shop-config';
import { type ExchangeRates } from '@/lib/services/currencyService';
import { BaseModal, ModalHeader, ModalBody, ModalFooter, Button } from '@/components/ui/Modal';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations, useLocale } from 'next-intl';

export default function CurrencySettings() {
  const t = useTranslations('settings.currency');
  const tCommon = useTranslations('common');
  const { addToast } = useToast();
  const locale = useLocale(); // 'pl' lub 'en'
  const [provider, setProvider] = useState<'exchangerate-api' | 'fixer' | 'ecb'>('ecb');
  const [apiKey, setApiKey] = useState('');
  const [config, setConfig] = useState<CurrencyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  const [ratesFetchedAt, setRatesFetchedAt] = useState<number>(0);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const result = await getCurrencyConfig();
      if (result.success && result.data) {
        setConfig(result.data);
        setProvider(result.data.provider as 'exchangerate-api' | 'fixer' | 'ecb');
      }
    } catch (error) {
      console.error('Failed to load Currency config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    // Load default currency from shop config
    getDefaultCurrency().then(currency => {
      setBaseCurrency(currency);
    });
  }, []);

  const handleSave = async () => {
    // Validate: exchangerate-api and fixer require API key
    if ((provider === 'exchangerate-api' || provider === 'fixer') && !apiKey.trim() && !config?.hasDatabaseConfig) {
      addToast(t('errors.apiKeyRequired'), 'error');
      return;
    }

    setSaving(true);

    try {
      const result = await saveCurrencyConfig({
        provider,
        apiKey: apiKey.trim() || undefined,
        enabled: true, // Always enabled
      });

      if (result.success) {
        addToast(t('messages.saved'), 'success');
        setApiKey('');
        await loadConfig();
      } else {
        addToast(result.error || t('errors.saveFailed'), 'error');
      }
    } catch (error) {
      addToast(t('errors.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setShowDeleteModal(false);

    try {
      const result = await deleteCurrencyConfig();

      if (result.success) {
        addToast(t('messages.deleted'), 'success');
        setApiKey('');
        setProvider('ecb');
        await loadConfig();
      } else {
        addToast(result.error || t('errors.deleteFailed'), 'error');
      }
    } catch (error) {
      addToast(t('errors.deleteFailed'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const fetchExchangeRates = async () => {
    // Toggle visibility
    const newShowRates = !showRates;
    setShowRates(newShowRates);

    // Jeśli rozwijamy i nie mamy jeszcze danych, załaduj je
    if (newShowRates && !rates) {
      setLoadingRates(true);
      setRatesError(null);

      try {
        const result = await getExchangeRates(baseCurrency);
        if (result) {
          setRates(result);
          setRatesFetchedAt(Date.now()); // Zapisz kiedy faktycznie pobrano dane
        } else {
          setRatesError('Failed to load rates');
        }
      } catch (error) {
        setRatesError('Failed to load rates');
      } finally {
        setLoadingRates(false);
      }
    }
  };

  const providerNeedsKey = provider === 'exchangerate-api' || provider === 'fixer';

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const getProviderLabel = (provider: string) => {
    const labels: { [key: string]: string } = {
      'ecb': 'ECB (Free)',
      'exchangerate-api': 'ExchangeRate-API',
      'fixer': 'Fixer.io'
    };
    return labels[provider] || provider;
  };

  return (
    <>
      {/* Delete Confirmation Modal */}
      <BaseModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="md">
        <ModalHeader title={t('deleteModal.title')} />
        <ModalBody>
          <p className="text-gray-600 dark:text-gray-400">
            {t('deleteModal.description')}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setShowDeleteModal(false)} variant="secondary">
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleDelete} variant="danger" loading={deleting}>
            {tCommon('delete')}
          </Button>
        </ModalFooter>
      </BaseModal>

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
          <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>

        {/* Info Banner - Exchange rates are approximate */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {t('info.title')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('info.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Source Info - ALWAYS SHOWN */}
        {config && (
          <div className={`mb-6 rounded-lg p-4 border ${
            config.configuredIn === 'both'
              ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
              : config.configuredIn === 'database'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : config.configuredIn === 'env'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
          }`}>
            <div className="flex items-start gap-3">
              {config.configuredIn === 'both' ? (
                <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              ) : config.configuredIn === 'database' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              ) : config.configuredIn === 'env' ? (
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {t('status.currentProvider')}: <span className="font-semibold">{getProviderLabel(config.provider)}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {config.configuredIn === 'both'
                    ? t('status.configuredBothDescription')
                    : config.configuredIn === 'database'
                    ? t('status.configuredDatabaseDescription')
                    : config.configuredIn === 'env'
                    ? t('status.configuredEnvDescription')
                    : t('status.defaultDescription')}
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Configuration Form */}
      <div className="space-y-4">
        {/* Provider Selection */}
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('providerLabel')}
          </label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as any)}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
          >
            <option value="ecb">{t('providers.ecb')}</option>
            <option value="exchangerate-api">{t('providers.exchangerateApi')}</option>
            <option value="fixer">{t('providers.fixer')}</option>
          </select>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {provider === 'ecb' && t('providerHelp.ecb')}
            {provider === 'exchangerate-api' && t('providerHelp.exchangerateApi')}
            {provider === 'fixer' && t('providerHelp.fixer')}
          </p>
        </div>

        {/* API Key Input - Only for exchangerate-api and fixer */}
        {providerNeedsKey && (
          <div>
            <label htmlFor="currency-api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('apiKeyLabel')}
            </label>
            <input
              type="password"
              id="currency-api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.hasDatabaseConfig ? '••••••••••••••••' : t('apiKeyPlaceholder')}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {provider === 'exchangerate-api' && (
                <>
                  {t('apiKeyHelp.exchangerateApi')}{' '}
                  <a
                    href="https://www.exchangerate-api.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    {t('getApiKey')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
              {provider === 'fixer' && (
                <>
                  {t('apiKeyHelp.fixer')}{' '}
                  <a
                    href="https://fixer.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    {t('getApiKey')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || deleting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('saveButton')}
          </button>

          {config?.hasDatabaseConfig && (
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={saving || deleting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('deleteButton')}
            </button>
          )}
        </div>
      </div>

      {/* Exchange Rates Display - Collapsible */}
      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
        <button
          onClick={fetchExchangeRates}
          className="flex items-center justify-between w-full text-left group"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {t('exchangeRates.title')}
            </span>
          </div>
          {showRates ? (
            <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          )}
        </button>

        {showRates && (
          <div className="mt-4 space-y-3">
            {loadingRates && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('exchangeRates.loading')}
                </span>
              </div>
            )}

            {ratesError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t('exchangeRates.error')}
                </p>
              </div>
            )}

            {rates && !loadingRates && (
              <>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3 text-xs bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('exchangeRates.baseCurrency')}:</span>{' '}
                    <span className="font-medium text-gray-900 dark:text-white">{baseCurrency}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('exchangeRates.provider', { provider: '' })}</span>{' '}
                    <span className="font-medium text-gray-900 dark:text-white">{getProviderLabel(config?.provider || 'ecb')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('exchangeRates.apiDate')}:</span>{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(rates.timestamp).toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('exchangeRates.cacheExpires')}:</span>{' '}
                    <span className="font-medium text-yellow-600 dark:text-yellow-500">
                      💾 {new Date(ratesFetchedAt + 3600000).toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <pre className="bg-gray-900 dark:bg-gray-950 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono border border-gray-700">
                  {JSON.stringify(rates, null, 2)}
                </pre>
              </>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
