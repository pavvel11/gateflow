'use client';

/**
 * OmnibusSettings Component
 * Global toggle for EU Omnibus Directive (2019/2161) compliance
 */

import { useState, useEffect } from 'react';
import { getShopConfig, updateShopConfig, type ShopConfig } from '@/lib/actions/shop-config';
import { useTranslations } from 'next-intl';

export default function OmnibusSettings() {
  const t = useTranslations('settings.omnibus');
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [omnibusEnabled, setOmnibusEnabled] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const data = await getShopConfig();
        if (data) {
          setConfig(data);
          setOmnibusEnabled(data.omnibus_enabled ?? true);
        }
      } catch (error) {
        console.error('Failed to load omnibus config:', error);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleToggle = async () => {
    const newValue = !omnibusEnabled;
    setOmnibusEnabled(newValue);
    setSaving(true);
    setMessage(null);

    try {
      const updates: Partial<ShopConfig> = {
        omnibus_enabled: newValue,
      };

      const success = await updateShopConfig(updates);

      if (success) {
        setMessage({ type: 'success', text: t('saveSuccess') });
        // Reload config and sync state
        const newConfig = await getShopConfig();
        if (newConfig) {
          setConfig(newConfig);
          setOmnibusEnabled(newConfig.omnibus_enabled ?? true);
        }
      } else {
        setMessage({ type: 'error', text: t('saveError') });
        // Revert on error
        setOmnibusEnabled(!newValue);
      }
    } catch (error) {
      console.error('Error saving omnibus settings:', error);
      setMessage({ type: 'error', text: t('saveError') });
      // Revert on error
      setOmnibusEnabled(!newValue);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('description')}
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
              ℹ️ {t('whatIsOmnibus')}
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
              {t('omnibusExplanation')}
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center justify-between py-4 px-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {t('enableOmnibus')}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {omnibusEnabled ? t('currentlyEnabled') : t('currentlyDisabled')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={saving}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${omnibusEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                ${saving ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              role="switch"
              aria-checked={omnibusEnabled}
            >
              <span
                aria-hidden="true"
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                  transition duration-200 ease-in-out
                  ${omnibusEnabled ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('additionalInfo')}
            </h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>{t('info1')}</li>
              <li>{t('info2')}</li>
              <li>{t('info3')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
