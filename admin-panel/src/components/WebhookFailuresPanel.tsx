'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import { WebhookLog } from '@/types/webhooks';
import WebhookLogsTable from './webhooks/WebhookLogsTable';

interface WebhookFailuresPanelProps {
  refreshTrigger: number; // To reload when main list updates
}

export default function WebhookFailuresPanel({ refreshTrigger }: WebhookFailuresPanelProps) {
  const t = useTranslations('admin.webhooks.logs');
  const tCommon = useTranslations('common');
  const { addToast } = useToast();
  
  const [failures, setFailures] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchFailures = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/webhooks/failures?limit=5');
      if (!res.ok) throw new Error('Failed to fetch failures');
      const data = await res.json();
      setFailures(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailures();
  }, [refreshTrigger]);

  const handleRetry = async (logId: string) => {
    setRetrying(logId);
    try {
      const res = await fetch(`/api/admin/webhooks/logs/${logId}/retry`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.success) {
        addToast(t('retrySuccess'), 'success');
        fetchFailures(); // Refresh list to remove fixed item (or show new status)
      } else {
        addToast(data.error || 'Retry failed', 'error');
      }
    } catch {
      addToast(tCommon('error'), 'error');
    } finally {
      setRetrying(null);
    }
  };

  if (loading && failures.length === 0) return null;
  if (failures.length === 0) return null;

  return (
    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl overflow-hidden mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="px-6 py-4 border-b border-red-200 dark:border-red-800 flex justify-between items-center bg-red-100/50 dark:bg-red-900/20">
        <div className="flex items-center space-x-2">
          <div className="bg-red-100 text-red-600 rounded-full p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-red-800 dark:text-red-200">
            {t('failuresTitle')}
          </h3>
        </div>
        <button 
          onClick={fetchFailures}
          className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm flex items-center transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {tCommon('refresh')}
        </button>
      </div>
      
      {/* Use the shared table component */}
      <WebhookLogsTable 
        logs={failures} 
        onRetry={handleRetry} 
        retryingId={retrying}
        showEndpointColumn={true}
        onRefresh={fetchFailures}
      />
    </div>
  );
}