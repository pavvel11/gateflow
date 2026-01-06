'use client';

import React from 'react';
import { ModalSection } from '@/components/ui/Modal';
import IconSelector from '@/components/IconSelector';
import { CURRENCIES, getCurrencySymbol } from '@/lib/constants';
import { PricingSectionProps } from '../types';

interface ExtendedPricingSectionProps extends PricingSectionProps {
  onIconSelect: (icon: string) => void;
}

export function PricingSection({
  formData,
  setFormData,
  t,
  priceDisplayValue,
  setPriceDisplayValue,
  onIconSelect,
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

  const showCurrencyPrefix = formData.currency !== 'PLN' && formData.currency !== 'CHF';

  return (
    <ModalSection title="Pricing & Visual">
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
