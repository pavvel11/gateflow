import OrderBumpsPageContent from '@/components/OrderBumpsPageContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order Bumps - Sellf Admin',
};

export default function OrderBumpsPage() {
  return <OrderBumpsPageContent />;
}