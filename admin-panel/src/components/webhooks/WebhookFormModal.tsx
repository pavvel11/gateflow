'use client';

import React, { useState, useEffect } from 'react';
import { WebhookEndpoint, WEBHOOK_EVENTS } from '@/types/webhooks';
import { BaseModal, ModalHeader, ModalBody, ModalFooter, Button } from '../ui/Modal';
import { useTranslations } from 'next-intl';

interface WebhookFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  editingEndpoint: WebhookEndpoint | null;
  isSubmitting: boolean;
}

export default function WebhookFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingEndpoint,
  isSubmitting
}: WebhookFormModalProps) {
  const t = useTranslations('admin.webhooks');
  const tCommon = useTranslations('common');

  const [formData, setFormData] = useState({
    url: '',
    description: '',
    events: [] as string[]
  });

  useEffect(() => {
    if (editingEndpoint) {
      setFormData({
        url: editingEndpoint.url,
        description: editingEndpoint.description || '',
        events: editingEndpoint.events
      });
    } else {
      setFormData({ url: '', description: '', events: [] });
    }
  }, [editingEndpoint, isOpen]);

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const getEventLabel = (eventValue: string) => {
    const key = eventValue.replace('.', '_');
    try {
      return t(`events_list.${key}`);
    } catch {
      return eventValue;
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title={editingEndpoint ? t('editWebhook') : t('addEndpoint')} />
      <ModalBody>
        <form
          id="webhook-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(formData);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('url')}
            </label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="https://api.zapier.com/..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('description')}
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g. CRM Integration"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('events')}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              {WEBHOOK_EVENTS.map((ev) => (
                <label key={ev.value} className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(ev.value)}
                    onChange={() => toggleEvent(ev.value)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-blue-500 transition-colors">
                      {getEventLabel(ev.value)}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">Event type: {ev.value}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose} variant="secondary">
          {tCommon('cancel')}
        </Button>
        <Button type="submit" form="webhook-form" loading={isSubmitting} variant="primary">
          {editingEndpoint ? t('update') : t('create')}
        </Button>
      </ModalFooter>
    </BaseModal>
  );
}
