'use client';

import { useState, useEffect } from 'react';
import { Building2, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { saveGUSAPIKey, getGUSConfig, deleteGUSAPIKey } from '@/lib/actions/gus-config';
import { useTranslations } from 'next-intl';

export default function GUSSettings() {
  const t = useTranslations('settings.gus');
  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const result = await getGUSConfig();
      if (result.success && result.data) {
        setEnabled(result.data.enabled);
        setHasKey(result.data.hasKey);
      }
    } catch (error) {
      console.error('Failed to load GUS config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim() && !hasKey) {
      setMessage({ type: 'error', text: t('errors.apiKeyRequired') });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const result = await saveGUSAPIKey({
        apiKey: apiKey.trim() || 'KEEP_EXISTING', // If empty and hasKey, keep existing
        enabled,
      });

      if (result.success) {
        setMessage({ type: 'success', text: t('messages.saved') });
        setApiKey('');
        await loadConfig();
      } else {
        setMessage({ type: 'error', text: result.error || t('errors.saveFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('errors.saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('confirmDelete'))) {
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      const result = await deleteGUSAPIKey();

      if (result.success) {
        setMessage({ type: 'success', text: t('messages.deleted') });
        setApiKey('');
        setEnabled(false);
        await loadConfig();
      } else {
        setMessage({ type: 'error', text: result.error || t('errors.deleteFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('errors.deleteFailed') });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>
        <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
      </div>

      {/* Status Banner */}
      {hasKey && enabled && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {t('status.active')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('status.activeDescription')}
              </p>
            </div>
          </div>
        </div>
      )}

      {hasKey && !enabled && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {t('status.disabled')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('status.disabledDescription')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="gus-api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('apiKeyLabel')}
          </label>
          <input
            type="password"
            id="gus-api-key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasKey ? '••••••••••••••••' : t('apiKeyPlaceholder')}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('apiKeyHelp')}{' '}
            <a
              href="https://api.stat.gov.pl/Home/RegonApi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              {t('getApiKey')}
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('enableLabel')}
            </span>
          </label>
          <p className="mt-1 ml-7 text-xs text-gray-500 dark:text-gray-400">
            {t('enableHelp')}
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}
          >
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || deleting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('saveButton')}
          </button>

          {hasKey && (
            <button
              onClick={handleDelete}
              disabled={saving || deleting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('deleteButton')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
