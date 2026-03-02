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
          <label className="block text-sm font-medium text-sf-body mb-2">
            {t('categories', { defaultValue: 'Categories' })}
          </label>
          <div className="border-2 border-sf-border-medium max-h-40 overflow-y-auto p-2 bg-sf-input">
            {loadingCategories ? (
              <div className="text-sm text-sf-muted p-2">Loading categories...</div>
            ) : allCategories.length === 0 ? (
              <div className="text-sm text-sf-muted p-2">No categories found. Create one in Settings &gt; Categories.</div>
            ) : (
              <div className="space-y-2">
                {allCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center space-x-2 cursor-pointer hover:bg-sf-hover p-1">
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(cat.id)}
                      onChange={(e) => handleCategoryToggle(cat.id, e.target.checked)}
                      className="h-4 w-4 text-sf-accent focus:ring-sf-accent border-sf-border rounded"
                    />
                    <span className="text-sm text-sf-heading">{cat.name}</span>
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
