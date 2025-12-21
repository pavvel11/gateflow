'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { WebhookLog, WebhookEndpoint } from '@/types/webhooks';
import { BaseModal, ModalHeader, ModalBody, ModalFooter, Button } from './ui/Modal';
import { useTranslations } from 'next-intl';
import WebhookLogsTable from './webhooks/WebhookLogsTable';

interface WebhookLogsDrawerProps {
  endpoint: WebhookEndpoint;
  onClose: () => void;
  isOpen: boolean;
}

export default function WebhookLogsDrawer({ endpoint, onClose, isOpen }: WebhookLogsDrawerProps) {
  const t = useTranslations('admin.webhooks.logs');
  const tCommon = useTranslations('common');
  const { addToast } = useToast();
  
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'archived'>('failed');
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/webhooks/logs?endpointId=${endpoint.id}&status=${filter}&limit=50`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
      addToast('Failed to load logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, filter, endpoint.id]);

  const handleRetry = async (logId: string) => {
    setRetrying(logId);
    try {
      const res = await fetch(`/api/admin/webhooks/logs/${logId}/retry`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.success) {
        addToast(t('retrySuccess'), 'success');
        fetchLogs(); // Refresh logs to show new attempt
      } else {
        addToast(data.error || 'Retry failed', 'error');
      }
    } catch {
      addToast(tCommon('error'), 'error');
    } finally {
      setRetrying(null);
    }
  };

  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader title={t('title')} subtitle={endpoint.url} />
      <ModalBody>
        <div className="flex justify-end mb-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('filterAll')}</option>
            <option value="success">{t('filterSuccess')}</option>
            <option value="failed">{t('filterFailed')}</option>
            <option value="archived">{t('filterArchived')}</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            {t('noLogs')}
          </div>
        ) : (
          <WebhookLogsTable 
            logs={logs} 
            onRetry={handleRetry} 
            retryingId={retrying}
            showEndpointColumn={false}
            onRefresh={fetchLogs}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose} variant="secondary">{tCommon('close')}</Button>
      </ModalFooter>
    </BaseModal>
  );
}