'use client';

import React from 'react';
import { ModalSection } from '@/components/ui/Modal';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { AvailabilitySectionProps } from '../types';

export function AvailabilitySection({
  formData,
  setFormData,
  t,
}: AvailabilitySectionProps) {
  return (
    <ModalSection title={t('temporalAvailability')} collapsible defaultExpanded={!!(formData.available_from || formData.available_until)}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateTimePicker
            label={t('availableFrom')}
            value={formData.available_from || ''}
            onChange={(value) => setFormData(prev => ({ ...prev, available_from: value }))}
            placeholder={t('selectStartDate')}
            description={t('productAvailableFrom')}
            showTimeSelect={true}
          />

          <DateTimePicker
            label={t('availableUntil')}
            value={formData.available_until || ''}
            onChange={(value) => setFormData(prev => ({ ...prev, available_until: value }))}
            placeholder={t('selectEndDate')}
            description={t('productUnavailableAfter')}
            showTimeSelect={true}
            minDate={formData.available_from ? new Date(formData.available_from) : undefined}
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">{t('temporalAvailabilityTitle')}</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {t('temporalAvailabilityDescription')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ModalSection>
  );
}
