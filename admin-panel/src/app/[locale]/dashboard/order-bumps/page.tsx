import OrderBumpsPageContent from '@/components/OrderBumpsPageContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order Bumps - GateFlow Admin',
};

export default function OrderBumpsPage() {
  return <OrderBumpsPageContent />;
}