'use client';

/**
 * Settings section for system updates.
 * Shows current version, check for updates button, and upgrade controls.
 *
 * @see /hooks/useUpdateCheck.ts
 */

import { useTranslations } from 'next-intl';
import { useUpdateCheck } from '@/hooks/useUpdateCheck';
import UpdateNotificationModal from '@/components/UpdateNotificationModal';

export default function SystemUpdateSettings() {
  const t = useTranslations('systemUpdate');
  const {
    updateInfo,
    isChecking,
    showModal,
    upgradeInProgress,
    upgradeProgress,
    checkNow,
    dismissUpdate,
    startUpgrade,
  } = useUpdateCheck(true);

  const currentVersion = updateInfo?.current_version || process.env.NEXT_PUBLIC_APP_VERSION || 'unknown';

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('settings.title')}
        </h2>

        <div className="space-y-4">
          {/* Current version */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.currentVersion')}
              </p>
              <p data-testid="current-version" className="text-lg font-mono text-gray-900 dark:text-white">
                v{currentVersion}
              </p>
            </div>

            <button
              onClick={() => checkNow(true)}
              disabled={isChecking}
              className="px-4 py-2 text-sm font-medium text-gf-accent border border-gf-accent/30 hover:bg-gf-accent/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? t('settings.checking') : t('settings.checkForUpdates')}
            </button>
          </div>

          {/* Update status */}
          {updateInfo && !updateInfo.update_available && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-green-800 dark:text-green-200">{t('settings.upToDate')}</p>
            </div>
          )}

          {updateInfo?.update_available && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t('settings.updateAvailable', { version: updateInfo.latest_version })}
                </p>
              </div>
              <button
                onClick={startUpgrade}
                disabled={upgradeInProgress}
                className="px-4 py-2 text-sm font-medium text-white bg-gf-accent hover:bg-gf-accent-hover rounded-lg transition-colors disabled:opacity-50"
              >
                {t('settings.upgradeNow')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {(showModal || upgradeInProgress) && updateInfo && (
        <UpdateNotificationModal
          updateInfo={updateInfo}
          upgradeInProgress={upgradeInProgress}
          upgradeProgress={upgradeProgress}
          onUpgrade={startUpgrade}
          onDismiss={dismissUpdate}
        />
      )}
    </>
  );
}
