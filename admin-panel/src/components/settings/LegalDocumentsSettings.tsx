'use client';

import { useState, useEffect } from 'react';
import { getShopConfig, updateShopConfig, type ShopConfig } from '@/lib/actions/shop-config';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from 'next-intl';

export default function LegalDocumentsSettings() {
  const t = useTranslations('settings.legal');
  const { addToast } = useToast();
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    terms_of_service_url: '',
    privacy_policy_url: '',
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const data = await getShopConfig();
        if (data) {
          setConfig(data);
          setFormData({
            terms_of_service_url: data.terms_of_service_url || '',
            privacy_policy_url: data.privacy_policy_url || '',
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
        terms_of_service_url: formData.terms_of_service_url || null,
        privacy_policy_url: formData.privacy_policy_url || null,
      };

      const success = await updateShopConfig(updates);

      if (success) {
        addToast(t('saveSuccess'), 'success');
        const newConfig = await getShopConfig();
        if (newConfig) setConfig(newConfig);
      } else {
        addToast(t('saveError'), 'error');
      }
    } catch (error) {
      console.error('Error saving legal documents:', error);
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
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {t('title')}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {t('description')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Terms of Service URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('termsOfServiceUrl')}
          </label>
          <input
            type="url"
            value={formData.terms_of_service_url}
            onChange={(e) => setFormData({ ...formData, terms_of_service_url: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com/terms-of-service.pdf"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('termsHelp')}
          </p>
        </div>

        {/* Privacy Policy URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('privacyPolicyUrl')}
          </label>
          <input
            type="url"
            value={formData.privacy_policy_url}
            onChange={(e) => setFormData({ ...formData, privacy_policy_url: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com/privacy-policy.pdf"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('privacyHelp')}
          </p>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex gap-3">
            <span className="text-blue-600 dark:text-blue-400 text-lg">ℹ️</span>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">{t('infoTitle')}</p>
              <p className="text-blue-700 dark:text-blue-300">{t('infoDescription')}</p>
              <div className="mt-2 flex gap-4">
                <a
                  href="/terms"
                  target="_blank"
                  className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                >
                  /terms
                </a>
                <a
                  href="/privacy"
                  target="_blank"
                  className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                >
                  /privacy
                </a>
              </div>
            </div>
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
