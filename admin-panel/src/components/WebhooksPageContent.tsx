'use client';

import React, { useState, useEffect } from 'react';
import { WebhookEndpoint } from '@/types/webhooks';
import { useTranslations } from 'next-intl';
import { useWebhooks } from '@/hooks/useWebhooks';

// Sub-components
import WebhookListTable from './webhooks/WebhookListTable';
import WebhookFormModal from './webhooks/WebhookFormModal';
import WebhookTestModal from './webhooks/WebhookTestModal';
import WebhookDeleteModal from './webhooks/WebhookDeleteModal';
import WebhookLogsDrawer from './WebhookLogsDrawer';
import WebhookFailuresPanel from './WebhookFailuresPanel';

export default function WebhooksPageContent() {
  const t = useTranslations('admin.webhooks');
  const {
    endpoints,
    loading,
    submitting,
    fetchEndpoints,
    createEndpoint,
    updateEndpoint,
    deleteEndpoint,
    testEndpoint
  } = useWebhooks();

  // UI States
  const [showFormModal, setShowFormModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [activeEndpoint, setActiveEndpoint] = useState<WebhookEndpoint | null>(null);
  const [logsEndpoint, setLogsEndpoint] = useState<WebhookEndpoint | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  const triggerGlobalRefresh = () => {
    setRefreshCounter(prev => prev + 1);
    fetchEndpoints();
  };

  // Handlers
  const handleOpenCreate = () => {
    setActiveEndpoint(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (endpoint: WebhookEndpoint) => {
    setActiveEndpoint(endpoint);
    setShowFormModal(true);
  };

  const handleOpenTest = (endpoint: WebhookEndpoint) => {
    setActiveEndpoint(endpoint);
    setShowTestModal(true);
  };

  const handleOpenDelete = (endpoint: WebhookEndpoint) => {
    setActiveEndpoint(endpoint);
    setShowDeleteModal(true);
  };

  const onFormSubmit = async (data: any) => {
    const success = activeEndpoint 
      ? await updateEndpoint(activeEndpoint.id, data)
      : await createEndpoint(data);
    
    if (success) {
      setShowFormModal(false);
      triggerGlobalRefresh();
    }
  };

  const onDeleteConfirm = async () => {
    if (!activeEndpoint) return;
    const success = await deleteEndpoint(activeEndpoint.id);
    if (success) {
      setShowDeleteModal(false);
      triggerGlobalRefresh();
    }
  };

  const onTestExecute = async (eventType: string) => {
    if (!activeEndpoint) return;
    setIsTesting(true);
    const success = await testEndpoint(activeEndpoint.id, eventType);
    setIsTesting(false);
    if (success) {
      setShowTestModal(false);
      setRefreshCounter(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">Manage outgoing webhooks for system events.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          {t('addEndpoint')}
        </button>
      </div>

      <WebhookFailuresPanel refreshTrigger={refreshCounter} />

      {loading && endpoints.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : endpoints.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-dashed border-gray-300 dark:border-gray-700">
          <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">{t('noEndpoints')}</p>
          <button onClick={handleOpenCreate} className="mt-4 text-blue-600 hover:text-blue-500 font-medium">
            {t('addEndpoint')}
          </button>
        </div>
      ) : (
        <WebhookListTable
          endpoints={endpoints}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
          onTest={handleOpenTest}
          onLogs={setLogsEndpoint}
        />
      )}

      {/* Modals */}
      <WebhookFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSubmit={onFormSubmit}
        editingEndpoint={activeEndpoint}
        isSubmitting={submitting}
      />

      <WebhookTestModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        onTest={onTestExecute}
        endpoint={activeEndpoint}
        isSending={isTesting}
      />

      <WebhookDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={onDeleteConfirm}
        endpoint={activeEndpoint}
      />

      {logsEndpoint && (
        <WebhookLogsDrawer
          isOpen={!!logsEndpoint}
          onClose={() => setLogsEndpoint(null)}
          endpoint={logsEndpoint}
        />
      )}
    </div>
  );
}