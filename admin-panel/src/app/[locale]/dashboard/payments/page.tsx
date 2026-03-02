import PaymentsDashboard from '@/components/admin/PaymentsDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payments - Sellf Admin',
};

export default function PaymentsPage() {
  return <PaymentsDashboard />;
}