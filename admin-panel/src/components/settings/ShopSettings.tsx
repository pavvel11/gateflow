'use client';

import { useState, useEffect } from 'react';
import { getShopConfig, updateShopConfig, type ShopConfig } from '@/lib/actions/shop-config';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from 'next-intl';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

export default function ShopSettings() {
  const t = useTranslations('settings.shop');
  const { addToast } = useToast();
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    default_currency: 'USD',
    shop_name: '',
    contact_email: '',
    tax_rate: '',
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const data = await getShopConfig();
        if (data) {
          setConfig(data);
          setFormData({
            default_currency: data.default_currency,
            shop_name: data.shop_name,
            contact_email: data.contact_email || '',
            tax_rate: data.tax_rate ? Math.round(data.tax_rate * 100).toString() : '',
          });
        }
      } catch (error) {
        console.error('Failed to load shop config:', error);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updates: Partial<ShopConfig> = {
        default_currency: formData.default_currency,
        shop_name: formData.shop_name,
        contact_email: formData.contact_email || null,
        tax_rate: formData.tax_rate ? parseFloat(formData.tax_rate) / 100 : null,
      };

      const success = await updateShopConfig(updates);

      if (success) {
        addToast(t('saveSuccess'), 'success');
        // Reload config
        const newConfig = await getShopConfig();
        if (newConfig) setConfig(newConfig);
      } else {
        addToast(t('saveError'), 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      addToast(t('saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        {t('title')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shop Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('shopName')}
          </label>
          <input
            type="text"
            value={formData.shop_name}
            onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('shopNamePlaceholder')}
            required
          />
        </div>

        {/* Default Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('defaultCurrency')}
            <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">
              This currency will be used for revenue goals and as the default display currency for all admins.
            </span>
          </label>
          <select
            value={formData.default_currency}
            onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.symbol} {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </div>

        {/* Contact Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('contactEmail')}
          </label>
          <input
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('contactEmailPlaceholder')}
          />
        </div>

        {/* Tax Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('taxRate')}
            <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">
              {t('taxRateHelp')}
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={formData.tax_rate}
              onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
              className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('taxRatePlaceholder')}
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? t('saving') : t('saveButton')}
          </button>
        </div>
      </form>
    </div>
  );
}
