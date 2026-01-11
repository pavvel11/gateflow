import ApiKeysPageContent from '@/components/ApiKeysPageContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Keys - GateFlow Admin',
};

export default function ApiKeysPage() {
  return <ApiKeysPageContent />;
}
