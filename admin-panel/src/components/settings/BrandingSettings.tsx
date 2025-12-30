'use client';

import { useState, useEffect } from 'react';
import { getShopConfig, updateShopConfig, type ShopConfig } from '@/lib/actions/shop-config';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from 'next-intl';

const FONTS = [
  { value: 'system', label: 'System Default', preview: 'font-sans' },
  { value: 'inter', label: 'Inter (Modern)', preview: 'font-sans' },
  { value: 'roboto', label: 'Roboto (Clean)', preview: 'font-sans' },
  { value: 'montserrat', label: 'Montserrat (Bold)', preview: 'font-sans' },
  { value: 'poppins', label: 'Poppins (Friendly)', preview: 'font-sans' },
  { value: 'playfair', label: 'Playfair (Elegant)', preview: 'font-serif' },
];

export default function BrandingSettings() {
  const t = useTranslations('settings.branding');
  const { addToast } = useToast();
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    logo_url: '',
    primary_color: '#9333ea',
    secondary_color: '#ec4899',
    accent_color: '#8b5cf6',
    font_family: 'system' as const,
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const data = await getShopConfig();
        if (data) {
          setConfig(data);
          setFormData({
            logo_url: data.logo_url || '',
            primary_color: data.primary_color || '#9333ea',
            secondary_color: data.secondary_color || '#ec4899',
            accent_color: data.accent_color || '#8b5cf6',
            font_family: (data.font_family as any) || 'system',
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
        logo_url: formData.logo_url || null,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        accent_color: formData.accent_color,
        font_family: formData.font_family as any,
      };

      const success = await updateShopConfig(updates);

      if (success) {
        addToast('Branding updated successfully! Refresh to see changes.', 'success');
        const newConfig = await getShopConfig();
        if (newConfig) setConfig(newConfig);
      } else {
        addToast('Failed to save branding settings.', 'error');
      }
    } catch (error) {
      console.error('Error saving branding:', error);
      addToast('An error occurred while saving.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      logo_url: '',
      primary_color: '#9333ea',
      secondary_color: '#ec4899',
      accent_color: '#8b5cf6',
      font_family: 'system',
    });
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Settings Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Branding & Whitelabel
          </h2>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Reset to defaults
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Logo URL
            </label>
            <input
              type="url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="https://i.ibb.co/..."
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Upload your logo to <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 underline">ImgBB</a> or any image hosting service and paste the URL here.
            </p>
          </div>

          {/* Colors */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Brand Colors</h3>

            <div className="grid grid-cols-3 gap-4">
              {/* Primary Color */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Primary
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="#9333ea"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Secondary
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="#ec4899"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="#8b5cf6"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Font Family
            </label>
            <select
              value={formData.font_family}
              onChange={(e) => setFormData({ ...formData, font_family: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {FONTS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              System fonts load instantly and perform best across all devices.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {saving ? 'Saving...' : 'Save Branding'}
            </button>
          </div>
        </form>
      </div>

      {/* Live Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Live Preview
        </h3>

        <div className="space-y-6">
          {/* Logo Preview */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Logo</p>
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo preview" className="w-10 h-10 object-contain rounded" />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{
                    background: `linear-gradient(to right, ${formData.primary_color}, ${formData.secondary_color})`
                  }}
                >
                  {config?.shop_name?.charAt(0) || 'G'}
                </div>
              )}
              <span className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: formData.font_family === 'system' ? undefined : formData.font_family }}>
                {config?.shop_name || 'GateFlow'}
              </span>
            </div>
          </div>

          {/* Color Swatches */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Color Palette</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div
                  className="w-full h-16 rounded-lg shadow-sm"
                  style={{ backgroundColor: formData.primary_color }}
                ></div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">Primary</p>
              </div>
              <div>
                <div
                  className="w-full h-16 rounded-lg shadow-sm"
                  style={{ backgroundColor: formData.secondary_color }}
                ></div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">Secondary</p>
              </div>
              <div>
                <div
                  className="w-full h-16 rounded-lg shadow-sm"
                  style={{ backgroundColor: formData.accent_color }}
                ></div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">Accent</p>
              </div>
            </div>
          </div>

          {/* Button Preview */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Buttons</p>
            <div className="space-y-2">
              <button
                type="button"
                className="w-full px-4 py-2 text-white font-medium rounded-lg shadow-md transition-all"
                style={{
                  background: `linear-gradient(to right, ${formData.primary_color}, ${formData.secondary_color})`
                }}
              >
                Primary Button
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-white font-medium rounded-lg shadow-md transition-all"
                style={{
                  backgroundColor: formData.accent_color
                }}
              >
                Accent Button
              </button>
            </div>
          </div>

          {/* Typography Preview */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Typography</p>
            <div
              className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              style={{ fontFamily: formData.font_family === 'system' ? undefined : formData.font_family }}
            >
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Heading Text
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                This is how your body text will look with the {FONTS.find(f => f.value === formData.font_family)?.label} font.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
