'use client';

import { useTranslations } from 'next-intl';

/**
 * "This checkout is open-source → GateFlow" branding watermark.
 * Shown at the bottom of checkout pages when no valid license is active.
 * A valid GateFlow license (time-limited or unlimited) hides this element.
 */
export default function GateFlowBranding() {
  const t = useTranslations('checkout');

  return (
    <div className="fixed bottom-3 left-0 right-0 text-center pointer-events-none z-10">
      <a
        href="https://gateflow.cytr.us?ref=checkout"
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
      >
        {t('checkoutBranding')}{' '}
        <span className="font-semibold underline decoration-dotted underline-offset-2">
          GateFlow
        </span>
      </a>
    </div>
  );
}
