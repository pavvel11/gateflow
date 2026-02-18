'use client';

import { useState, useEffect } from 'react';
import { getShopConfig, updateShopConfig } from '@/lib/actions/shop-config';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from 'next-intl';

const THEME_OPTIONS = [
  { value: 'system', icon: '💻' },
  { value: 'light', icon: '☀️' },
  { value: 'dark', icon: '🌙' },
] as const;

export default function CheckoutThemeSettings() {
  const t = useTranslations('settings.checkoutTheme');
  const { addToast } = useToast();
  const [theme, setTheme] = useState<string>('system');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const config = await getShopConfig();
        if (config?.checkout_theme) {
          setTheme(config.checkout_theme);
        }
      } catch (error) {
        console.error('Failed to load checkout theme:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (newTheme: string) => {
    setTheme(newTheme);
    setSaving(true);
    try {
      const success = await updateShopConfig({ checkout_theme: newTheme as any });
      if (success) {
        addToast(t('saveSuccess'), 'success');
      } else {
        addToast(t('saveError'), 'error');
      }
    } catch (error) {
      console.error('Error saving checkout theme:', error);
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
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {t('title')}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('description')}
      </p>

      <div className="flex gap-3">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSave(option.value)}
            disabled={saving}
            className={`flex-1 flex flex-col items-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${
              theme === option.value
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className={`text-sm font-medium ${
              theme === option.value
                ? 'text-purple-700 dark:text-purple-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {t(option.value)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
