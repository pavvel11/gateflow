'use client';

import React from 'react';
import { WebhookEndpoint } from '@/types/webhooks';
import { BaseModal, ModalHeader, ModalBody, ModalFooter, Button } from '../ui/Modal';
import { useTranslations } from 'next-intl';

interface WebhookDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  endpoint: WebhookEndpoint | null;
}

export default function WebhookDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  endpoint
}: WebhookDeleteModalProps) {
  const t = useTranslations('admin.webhooks');
  const tCommon = useTranslations('common');

  if (!endpoint) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title={t('deleteTitle')} />
      <ModalBody>
        <p className="text-gray-600 dark:text-gray-400">
          {t('deleteConfirm')} <br />
          <span className="font-mono text-xs mt-2 block p-2 bg-gray-100 dark:bg-gray-900 rounded">
            {endpoint.url}
          </span>
        </p>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose} variant="secondary">
          {tCommon('cancel')}
        </Button>
        <Button onClick={onConfirm} variant="danger">
          {tCommon('delete')}
        </Button>
      </ModalFooter>
    </BaseModal>
  );
}
