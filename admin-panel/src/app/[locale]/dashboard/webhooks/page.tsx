import WebhooksPageContent from '@/components/WebhooksPageContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Webhooks - GateFlow Admin',
};

export default function WebhooksPage() {
  return <WebhooksPageContent />;
}
