'use client';

import React from 'react';
import { ModalSection } from '@/components/ui/Modal';
import { AdvancedSectionProps } from '../types';

export function AdvancedSection({
  formData,
  setFormData,
  t,
  omnibusEnabled,
}: AdvancedSectionProps) {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  return (
    <ModalSection title={t('advancedSettings')} collapsible defaultExpanded={!formData.is_active || !formData.is_listed || formData.is_featured || formData.omnibus_exempt}>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={formData.is_active}
            onChange={handleCheckboxChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('productActive')}
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_listed"
            name="is_listed"
            checked={formData.is_listed}
            onChange={handleCheckboxChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_listed" className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('productListed')}
          </label>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {t('productListedHelp')}
          </span>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_featured"
            name="is_featured"
            checked={formData.is_featured}
            onChange={handleCheckboxChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_featured" className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('featuredProduct')}
          </label>
        </div>

        {omnibusEnabled && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="omnibus_exempt"
              name="omnibus_exempt"
              checked={formData.omnibus_exempt}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="omnibus_exempt" className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('omnibusExempt')}
            </label>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              {t('omnibusExemptHelp')}
            </span>
          </div>
        )}
      </div>
    </ModalSection>
  );
}
