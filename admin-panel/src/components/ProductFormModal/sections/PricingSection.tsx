'use client';

import React from 'react';
import { ModalSection } from '@/components/ui/Modal';
import IconSelector from '@/components/IconSelector';
import { CURRENCIES, getCurrencySymbol } from '@/lib/constants';
import { PricingSectionProps } from '../types';
import { Info } from 'lucide-react';

interface ExtendedPricingSectionProps extends PricingSectionProps {
  onIconSelect: (icon: string) => void;
  shopDefaultVatRate?: number | null;
}

export function PricingSection({
  formData,
  setFormData,
  t,
  priceDisplayValue,
  setPriceDisplayValue,
  onIconSelect,
  shopDefaultVatRate,
}: ExtendedPricingSectionProps) {

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      currency: e.target.value
    }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    if (inputValue === '') {
      setPriceDisplayValue('0');
      setFormData(prev => ({ ...prev, price: 0 }));
      return;
    }

    if (!/^[\d,.]*$/.test(inputValue)) return;

    const processedValue = inputValue.replace(',', '.');
    const dotCount = (processedValue.match(/\./g) || []).length;
    if (dotCount > 1) return;

    if (/^\d*\.?\d{0,2}$/.test(processedValue)) {
      const numericValue = parseFloat(processedValue);
      setPriceDisplayValue(inputValue);
      setFormData(prev => ({
        ...prev,
        price: isNaN(numericValue) ? 0 : numericValue
      }));
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      image_url: e.target.value || null
    }));
  };

  const handleCustomPriceToggle = (enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      allow_custom_price: enabled,
      // When enabling PWYW, set reasonable defaults
      ...(enabled && {
        custom_price_min: prev.custom_price_min || 1,
        show_price_presets: prev.show_price_presets !== false,
        custom_price_presets: prev.custom_price_presets?.length ? prev.custom_price_presets : [5, 10, 25]
      })
    }));
  };

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    // Enforce Stripe minimum of 0.50
    setFormData(prev => ({
      ...prev,
      custom_price_min: Math.max(0.50, value)
    }));
  };

  const handlePresetToggle = (enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      show_price_presets: enabled
    }));
  };

  const handlePresetChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => {
      const newPresets = [...(prev.custom_price_presets || [0, 0, 0])];
      newPresets[index] = numValue;
      return {
        ...prev,
        custom_price_presets: newPresets
      };
    });
  };

  const showCurrencyPrefix = formData.currency !== 'PLN' && formData.currency !== 'CHF';

  return (
    <ModalSection title="Pricing & Visual">
      {/* Pay What You Want Toggle - at the top */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <input
          type="checkbox"
          id="allow_custom_price"
          checked={formData.allow_custom_price}
          onChange={(e) => handleCustomPriceToggle(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <div className="flex-1">
          <label htmlFor="allow_custom_price" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            {t('customPricing.allowCustomPrice')}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('customPricing.allowCustomPriceHelp')}
          </p>
        </div>
      </div>

      {/* Standard Price OR Custom Price Settings */}
      {!formData.allow_custom_price ? (
        // Standard fixed price
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('price')}
            </label>
            <div className="relative rounded-lg shadow-sm">
              {showCurrencyPrefix && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 text-sm min-w-[24px]">
                    {getCurrencySymbol(formData.currency)}
                  </span>
                </div>
              )}
              <input
                type="text"
                inputMode="decimal"
                id="price"
                name="price"
                value={priceDisplayValue}
                onChange={handlePriceChange}
                placeholder={!showCurrencyPrefix ? `0,00 ${getCurrencySymbol(formData.currency)}` : "0.00"}
                className={`${showCurrencyPrefix ? 'pl-12' : 'pl-3'} pr-20 w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white`}
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleCurrencyChange}
                  className="h-full py-0 pl-2 pr-7 border-transparent bg-transparent text-gray-500 dark:text-gray-400 text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {CURRENCIES.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('setToZeroForFree')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('productIcon')}
            </label>
            <IconSelector
              selectedIcon={formData.icon}
              onSelectIcon={onIconSelect}
            />
          </div>
        </div>
      ) : (
        // Pay What You Want pricing
        <div className="space-y-4">
          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {t('customPricing.stripeMinimum')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Minimum Price + Currency */}
            <div>
              <label htmlFor="custom_price_min" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('customPricing.minimumPrice')}
              </label>
              <div className="relative rounded-lg shadow-sm">
                {showCurrencyPrefix && (
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      {getCurrencySymbol(formData.currency)}
                    </span>
                  </div>
                )}
                <input
                  type="number"
                  id="custom_price_min"
                  value={formData.custom_price_min}
                  onChange={handleMinPriceChange}
                  min="0.50"
                  step="0.01"
                  className={`${showCurrencyPrefix ? 'pl-8' : 'pl-3'} pr-20 w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white`}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <select
                    value={formData.currency}
                    onChange={handleCurrencyChange}
                    className="h-full py-0 pl-2 pr-7 border-transparent bg-transparent text-gray-500 dark:text-gray-400 text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CURRENCIES.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Product Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('productIcon')}
              </label>
              <IconSelector
                selectedIcon={formData.icon}
                onSelectIcon={onIconSelect}
              />
            </div>
          </div>

          {/* Show Preset Buttons Toggle */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="show_price_presets"
              checked={formData.show_price_presets}
              onChange={(e) => handlePresetToggle(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="show_price_presets" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              {t('customPricing.showPresets')}
            </label>
          </div>

          {/* Preset Amounts - allow 0 to hide */}
          {formData.show_price_presets && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t('customPricing.showPresetsHelp')} (0 = ukryty)
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('customPricing.presetAmount')} {index + 1}
                    </label>
                    <div className="relative">
                      {showCurrencyPrefix && (
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                            {getCurrencySymbol(formData.currency)}
                          </span>
                        </div>
                      )}
                      <input
                        type="number"
                        value={formData.custom_price_presets?.[index] ?? 0}
                        onChange={(e) => handlePresetChange(index, e.target.value)}
                        min="0"
                        step="1"
                        placeholder="0"
                        className={`${showCurrencyPrefix ? 'pl-6' : 'pl-3'} pr-2 w-full py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VAT / Tax Configuration */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="price_includes_vat"
            checked={formData.price_includes_vat}
            onChange={(e) => setFormData(prev => ({ ...prev, price_includes_vat: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div className="flex-1">
            <label htmlFor="price_includes_vat" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              {t('vatIncluded')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('vatIncludedHelp')}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="vat_rate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('vatRate')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              id="vat_rate"
              value={formData.vat_rate ?? ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                vat_rate: e.target.value === '' ? null : parseFloat(e.target.value)
              }))}
              min="0"
              max="100"
              step="1"
              placeholder={shopDefaultVatRate != null ? `${Math.round(shopDefaultVatRate * 100)}` : '23'}
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('vatRateHelp', { defaultRate: shopDefaultVatRate != null ? `${Math.round(shopDefaultVatRate * 100)}%` : '—' })}
          </p>
        </div>
      </div>

      {/* Product Image URL */}
      <div className="mt-6">
        <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('imageUrl')}
        </label>
        <input
          type="url"
          id="image_url"
          name="image_url"
          value={formData.image_url || ''}
          onChange={handleImageUrlChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://i.ibb.co/..."
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Wgraj zdjęcie produktu na <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 underline">ImgBB</a> lub inny serwis hostingowy i wklej tutaj URL.
        </p>
      </div>
    </ModalSection>
  );
}
