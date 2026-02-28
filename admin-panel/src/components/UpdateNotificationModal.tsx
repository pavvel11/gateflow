'use client';

/**
 * Modal for update notifications and upgrade progress.
 *
 * Shows when a new version is available (via useUpdateCheck hook).
 * During upgrade, displays a step-by-step progress bar.
 *
 * @see /hooks/useUpdateCheck.ts
 */

import { useTranslations } from 'next-intl';
import type { UpdateInfo, UpgradeProgress } from '@/hooks/useUpdateCheck';

interface UpdateNotificationModalProps {
  updateInfo: UpdateInfo;
  upgradeInProgress: boolean;
  upgradeProgress: UpgradeProgress | null;
  onUpgrade: () => void;
  onDismiss: () => void;
}

const UPGRADE_STEPS = [
  { key: 'checking', label: 'steps.checking' },
  { key: 'downloading', label: 'steps.downloading' },
  { key: 'backing_up', label: 'steps.backingUp' },
  { key: 'extracting', label: 'steps.extracting' },
  { key: 'migrating', label: 'steps.migrating' },
  { key: 'restarting', label: 'steps.restarting' },
];

function StepIndicator({ stepKey, currentStep, t }: {
  stepKey: string;
  currentStep: string;
  t: (key: string) => string;
}) {
  const stepOrder = UPGRADE_STEPS.map(s => s.key);
  const currentIdx = stepOrder.indexOf(currentStep);
  const thisIdx = stepOrder.indexOf(stepKey);
  const label = UPGRADE_STEPS.find(s => s.key === stepKey)?.label || stepKey;

  let icon: string;
  let textClass: string;
  if (thisIdx < currentIdx || currentStep === 'done') {
    icon = '\u2705';
    textClass = 'text-green-600 dark:text-green-400';
  } else if (thisIdx === currentIdx) {
    icon = '\u23F3';
    textClass = 'text-gf-accent font-medium';
  } else {
    icon = '\u25CB';
    textClass = 'text-gray-400 dark:text-gray-600';
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${textClass}`}>
      <span>{icon}</span>
      <span>{t(label)}</span>
    </div>
  );
}

export default function UpdateNotificationModal({
  updateInfo,
  upgradeInProgress,
  upgradeProgress,
  onUpgrade,
  onDismiss,
}: UpdateNotificationModalProps) {
  const t = useTranslations('systemUpdate');
  const isFailed = upgradeProgress?.step === 'failed';
  const isDone = upgradeProgress?.step === 'done';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        {!upgradeInProgress ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gf-accent/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-gf-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('modal.title', { version: updateInfo.latest_version })}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('modal.currentVersion', { version: updateInfo.current_version })}
                  {updateInfo.published_at && (
                    <> &middot; {t('modal.published', {
                      date: new Date(updateInfo.published_at).toLocaleDateString()
                    })}</>
                  )}
                </p>
              </div>
            </div>

            {/* Release notes */}
            {updateInfo.release_notes && (
              <div className="mb-5 max-h-48 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                <p className="font-medium text-gray-900 dark:text-white mb-2">{t('modal.whatsNew')}</p>
                <div className="whitespace-pre-wrap">{updateInfo.release_notes}</div>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2 mb-5 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-amber-800 dark:text-amber-200">{t('modal.backupWarning')}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={onDismiss}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {t('modal.remindLater')}
              </button>
              <button
                onClick={onUpgrade}
                className="px-4 py-2 text-sm font-medium text-white bg-gf-accent hover:bg-gf-accent-hover rounded-lg transition-colors"
              >
                {t('modal.upgradeNow')}
              </button>
            </div>
          </>
        ) : (
          /* Upgrade in progress */
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {isDone
                ? t('progress.done')
                : isFailed
                  ? t('progress.failed')
                  : t('progress.title', { version: updateInfo.latest_version })}
            </h3>

            {/* Progress bar */}
            {!isFailed && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <span>{upgradeProgress?.message || t('progress.starting')}</span>
                  <span>{Math.max(0, upgradeProgress?.progress || 0)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${isDone ? 'bg-green-500' : 'bg-gf-accent'}`}
                    style={{ width: `${Math.max(0, upgradeProgress?.progress || 0)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Step list */}
            {!isFailed && !isDone && upgradeProgress && (
              <div className="space-y-2 mb-4">
                {UPGRADE_STEPS.map(step => (
                  <StepIndicator
                    key={step.key}
                    stepKey={step.key}
                    currentStep={upgradeProgress.step}
                    t={t}
                  />
                ))}
              </div>
            )}

            {/* Error message */}
            {isFailed && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">{upgradeProgress?.message}</p>
                {upgradeProgress?.rollback && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{t('progress.rolledBack')}</p>
                )}
              </div>
            )}

            {/* Success message */}
            {isDone && (
              <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">{upgradeProgress?.message}</p>
              </div>
            )}

            {/* Footer */}
            {!isDone && !isFailed && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                {t('progress.doNotClose')}
              </p>
            )}

            {(isDone || isFailed) && (
              <div className="flex justify-end">
                <button
                  onClick={() => isDone ? window.location.reload() : onDismiss()}
                  className="px-4 py-2 text-sm font-medium text-white bg-gf-accent hover:bg-gf-accent-hover rounded-lg transition-colors"
                >
                  {isDone ? t('progress.reload') : t('progress.close')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
