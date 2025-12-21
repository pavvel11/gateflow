import { useState, useCallback } from 'react';
import { WebhookEndpoint } from '@/types/webhooks';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from 'next-intl';

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
      const res = await fetch('/api/admin/webhooks');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEndpoints(data);
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
      const res = await fetch('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed');
      addToast(t('createSuccess'), 'success');
      fetchEndpoints();
      return true;
    } catch {
      addToast(tCommon('error'), 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updateEndpoint = async (id: string, data: Partial<WebhookEndpoint>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed');
      addToast(t('updateSuccess'), 'success');
      fetchEndpoints();
      return true;
    } catch {
      addToast(tCommon('error'), 'error');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEndpoint = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      addToast(tCommon('success'), 'success');
      fetchEndpoints();
      return true;
    } catch {
      addToast(tCommon('error'), 'error');
      return false;
    }
  };

  const testEndpoint = async (id: string, eventType: string) => {
    try {
      const res = await fetch('/api/admin/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpointId: id, eventType })
      });
      const data = await res.json();
      
      if (data.success) {
        addToast(t('testSuccess') + ` (HTTP ${data.status})`, 'success');
        return true;
      } else {
        addToast(t('testFailed') + `: ${data.error}`, 'error');
        return false;
      }
    } catch {
      addToast(tCommon('error'), 'error');
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
