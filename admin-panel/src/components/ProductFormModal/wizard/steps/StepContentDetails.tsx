'use client';

import React from 'react';
import { ContentDeliverySection, CategoriesSection } from '../../sections';
import type { ProductFormData, TranslationFunction, UrlValidation } from '../../types';
import type { Category } from '@/lib/actions/categories';

interface StepContentDetailsProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  t: TranslationFunction;
  urlValidation: Record<number, UrlValidation>;
  setUrlValidation: React.Dispatch<React.SetStateAction<Record<number, UrlValidation>>>;
  validateContentItemUrl: (url: string, type: 'video_embed' | 'download_link') => UrlValidation;
  allCategories: Category[];
  loadingCategories: boolean;
}

export const StepContentDetails: React.FC<StepContentDetailsProps> = ({
  formData,
  setFormData,
  t,
  urlValidation,
  setUrlValidation,
  validateContentItemUrl,
  allCategories,
  loadingCategories,
}) => {
  return (
    <div className="space-y-6">
      <ContentDeliverySection
        formData={formData}
        setFormData={setFormData}
        t={t}
        urlValidation={urlValidation}
        setUrlValidation={setUrlValidation}
        validateContentItemUrl={validateContentItemUrl}
      />

      <CategoriesSection
        formData={formData}
        setFormData={setFormData}
        t={t}
        allCategories={allCategories}
        loadingCategories={loadingCategories}
      />
    </div>
  );
};
