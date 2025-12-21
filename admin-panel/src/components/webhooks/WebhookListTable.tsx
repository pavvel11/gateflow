'use client';

import React from 'react';
import { WebhookEndpoint } from '@/types/webhooks';
import { useTranslations } from 'next-intl';

interface WebhookListTableProps {
  endpoints: WebhookEndpoint[];
  onEdit: (endpoint: WebhookEndpoint) => void;
  onDelete: (endpoint: WebhookEndpoint) => void;
  onTest: (endpoint: WebhookEndpoint) => void;
  onLogs: (endpoint: WebhookEndpoint) => void;
}

export default function WebhookListTable({
  endpoints,
  onEdit,
  onDelete,
  onTest,
  onLogs
}: WebhookListTableProps) {
  const t = useTranslations('admin.webhooks');
  const tCommon = useTranslations('common');

  const getEventLabel = (eventValue: string) => {
    const key = eventValue.replace('.', '_');
    try {
      return t(`events_list.${key}`);
    } catch {
      return eventValue;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden rounded-xl">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('description')} / {t('url')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('events')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('active')}
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {tCommon('actions')}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {endpoints.map((endpoint) => (
            <tr key={endpoint.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs" title={endpoint.description || endpoint.url}>
                  {endpoint.description || endpoint.url}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs font-mono">
                  {endpoint.url}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {endpoint.events.map((ev) => (
                    <span
                      key={ev}
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    >
                      {getEventLabel(ev)}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  endpoint.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {endpoint.is_active ? t('active') : tCommon('inactive')}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                <button
                  onClick={() => onLogs(endpoint)}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  Logs
                </button>
                <button
                  onClick={() => onTest(endpoint)}
                  className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  {t('test')}
                </button>
                <button
                  onClick={() => onEdit(endpoint)}
                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  {t('edit')}
                </button>
                <button
                  onClick={() => onDelete(endpoint)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                >
                  {t('delete')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
