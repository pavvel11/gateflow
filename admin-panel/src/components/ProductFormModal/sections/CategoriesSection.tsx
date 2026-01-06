'use client';

import React from 'react';
import { ModalSection } from '@/components/ui/Modal';
import { CategoriesSectionProps } from '../types';

export function CategoriesSection({
  formData,
  setFormData,
  t,
  allCategories,
  loadingCategories,
}: CategoriesSectionProps) {
  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      categories: checked
        ? [...prev.categories, categoryId]
        : prev.categories.filter(id => id !== categoryId)
    }));
  };

  return (
    <ModalSection title={t('organization', { defaultValue: 'Organization' })} collapsible defaultExpanded={formData.categories.length > 0}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('categories', { defaultValue: 'Categories' })}
          </label>
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto p-2 bg-white dark:bg-gray-700">
            {loadingCategories ? (
              <div className="text-sm text-gray-500 p-2">Loading categories...</div>
            ) : allCategories.length === 0 ? (
              <div className="text-sm text-gray-500 p-2">No categories found. Create one in Settings &gt; Categories.</div>
            ) : (
              <div className="space-y-2">
                {allCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(cat.id)}
                      onChange={(e) => handleCategoryToggle(cat.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{cat.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalSection>
  );
}
