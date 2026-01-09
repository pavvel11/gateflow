/**
 * Webhooks Hook for v1 API
 *
 * Provides a consistent interface for webhook endpoint operations.
 */

import { useState, useCallback } from 'react';
import { WebhookEndpoint } from '@/types/webhooks';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import { api, ApiError } from '@/lib/api/client';

export function useWebhooks() {
  const t = useTranslations('admin.webhooks');
  const tCommon = useTranslations('common');
  const { addToast } = useToast();

  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchEndpoints = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.list<WebhookEndpoint>('webhooks', { limit: 100 });
      setEndpoints(response.data || []);
    } catch (err) {
      console.error(err);
      addToast(tCommon('error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, tCommon]);

  const createEndpoint = async (data: Partial<WebhookEndpoint>) => {
    setSubmitting(true);
    try {
      await api.create<WebhookEndpoint>('webhooks', data as Record<string, unknown>);
      addToast(t('createSuccess'), 'success');
      fetchEndpoints();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        addToast(err.message, 'error');
      } else {
        addToast(tCommon('error'), 'error');
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updateEndpoint = async (id: string, data: Partial<WebhookEndpoint>) => {
    setSubmitting(true);
    try {
      await api.update<WebhookEndpoint>('webhooks', id, data as Record<string, unknown>);
      addToast(t('updateSuccess'), 'success');
      fetchEndpoints();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        addToast(err.message, 'error');
      } else {
        addToast(tCommon('error'), 'error');
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEndpoint = async (id: string) => {
    try {
      await api.delete('webhooks', id);
      addToast(tCommon('success'), 'success');
      fetchEndpoints();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        addToast(err.message, 'error');
      } else {
        addToast(tCommon('error'), 'error');
      }
      return false;
    }
  };

  const testEndpoint = async (id: string, eventType: string) => {
    try {
      // Use v1 test endpoint
      const response = await api.postCustom<{ success: boolean; status?: number; error?: string }>(
        `webhooks/${id}/test`,
        { event_type: eventType }
      );

      if (response.success) {
        addToast(t('testSuccess') + ` (HTTP ${response.status})`, 'success');
        return true;
      } else {
        addToast(t('testFailed') + `: ${response.error}`, 'error');
        return false;
      }
    } catch (err) {
      if (err instanceof ApiError) {
        addToast(t('testFailed') + `: ${err.message}`, 'error');
      } else {
        addToast(tCommon('error'), 'error');
      }
      return false;
    }
  };

  return {
    endpoints,
    loading,
    submitting,
    fetchEndpoints,
    createEndpoint,
    updateEndpoint,
    deleteEndpoint,
    testEndpoint
  };
}
