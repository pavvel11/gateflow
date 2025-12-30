'use client';

import React, { useState } from 'react';
import { WebhookLog } from '@/types/webhooks';
import { useTranslations } from 'next-intl';
import { useToast } from '@/contexts/ToastContext';

interface WebhookLogsTableProps {
  logs: WebhookLog[];
  onRetry: (logId: string) => void;
  retryingId: string | null;
  showEndpointColumn?: boolean;
  onRefresh?: () => void;
}

export default function WebhookLogsTable({
  logs,
  onRetry,
  retryingId,
  showEndpointColumn = false,
  onRefresh
}: WebhookLogsTableProps) {
  const t = useTranslations('admin.webhooks.logs');
  const tCommon = useTranslations('common');
  const { addToast } = useToast();
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const getStatusBadge = (log: WebhookLog) => {
    if (log.status === 'success') {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded text-xs font-medium border border-green-200 dark:border-green-800">
          HTTP {log.http_status}
        </span>
      );
    }
    if (log.status === 'retried') {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded text-xs font-medium border border-yellow-200 dark:border-yellow-800">
          Retried
        </span>
      );
    }
    if (log.status === 'archived') {
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded text-xs font-medium border border-gray-200 dark:border-gray-600">
            Archived
          </span>
        );
    }
    
    // Failed
    if (log.http_status === 0) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded text-xs font-medium border border-red-200 dark:border-red-800">Network Error</span>;
    }
    return <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded text-xs font-medium border border-red-200 dark:border-red-800">HTTP {log.http_status}</span>;
  };

  const handleRetryClick = (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    onRetry(logId);
  };

  const handleArchive = async (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    setArchivingId(logId);
    try {
      const res = await fetch(`/api/admin/webhooks/logs/${logId}/archive`, {
        method: 'POST'
      });
      if (res.ok) {
        addToast('Log archived', 'success');
        onRefresh?.();
      }
    } catch {
      addToast('Failed to archive log', 'error');
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('date')}</th>
            {showEndpointColumn && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('endpoint')}</th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('event')}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('status')}</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('duration')}</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{tCommon('actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {logs.map((log) => (
            <React.Fragment key={log.id}>
              <tr 
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                className={`cursor-pointer transition-colors ${
                  expandedLog === log.id 
                    ? 'bg-blue-50 dark:bg-blue-900/10' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
              >
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                
                {showEndpointColumn && (
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white max-w-[200px] truncate">
                      {log.endpoint?.description || 'Webhook'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[200px]">
                      {log.endpoint?.url}
                    </div>
                  </td>
                )}

                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono text-[10px]">
                  {log.event_type}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getStatusBadge(log)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">
                  {log.duration_ms !== undefined ? `${log.duration_ms}ms` : '---'}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                  {log.status === 'failed' && (
                    <button
                      onClick={(e) => handleRetryClick(e, log.id)}
                      disabled={retryingId === log.id}
                      className="inline-flex items-center px-2.5 py-1.5 border border-blue-300 dark:border-blue-800 text-xs font-medium rounded text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 transition-all"
                    >
                      {retryingId === log.id ? '...' : t('retry')}
                    </button>
                  )}
                  {log.status === 'failed' && (
                    <button
                      onClick={(e) => handleArchive(e, log.id)}
                      disabled={archivingId === log.id}
                      title="Archive/Dismiss"
                      className="inline-flex items-center p-1.5 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors"
                    >
                      {archivingId === log.id ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  )}
                </td>
              </tr>
              {expandedLog === log.id && (
                <tr className="bg-gray-50 dark:bg-gray-900/30">
                  <td colSpan={showEndpointColumn ? 6 : 5} className="px-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">{t('payload')}</h4>
                        <pre className="text-[10px] bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto h-48 font-mono text-gray-800 dark:text-gray-200">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">{t('response')}</h4>
                        <div className="text-[10px] bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 h-48 overflow-y-auto">
                          {log.error_message && (
                            <div className="text-red-600 dark:text-red-400 font-medium mb-2 border-b border-red-100 dark:border-red-900/30 pb-2">
                              Error: {log.error_message}
                            </div>
                          )}
                          <pre className="whitespace-pre-wrap font-mono text-gray-800 dark:text-gray-200">
                            {log.response_body || '(Empty response body)'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
