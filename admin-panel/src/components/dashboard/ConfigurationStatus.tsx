'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Simple info banner shown on dashboard
 * Shows only a gentle reminder that exchange rates are approximate
 * Always visible (for all currency configs)
 */
export default function ConfigurationStatus() {
  const t = useTranslations('dashboard.currency');

  return (
    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {t('dashboardInfo')}
        </p>
      </div>
    </div>
  );
}
