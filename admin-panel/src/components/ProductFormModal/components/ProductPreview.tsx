'use client';

import React from 'react';
import { ModalSection } from '@/components/ui/Modal';
import { getCurrencySymbol } from '@/lib/constants';
import { ProductFormData, TranslationFunction } from '../types';

interface ProductPreviewProps {
  formData: ProductFormData;
  t: TranslationFunction;
}

export function ProductPreview({ formData, t }: ProductPreviewProps) {
  return (
    <ModalSection>
      <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="w-16 h-16 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <span className="text-3xl" aria-label="Product icon">{formData.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {formData.name || 'Product Name'}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
            {formData.slug || 'product-slug'}
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              formData.price === 0
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            }`}>
              {formData.price === 0 ? t('free') : `${getCurrencySymbol(formData.currency)}${formData.price}`}
            </span>
            {formData.is_featured && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                ⭐ {t('featured')}
              </span>
            )}
            {formData.slug && (
              <a
                href={`/p/${formData.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {t('preview')}
              </a>
            )}
          </div>
        </div>
      </div>
    </ModalSection>
  );
}
