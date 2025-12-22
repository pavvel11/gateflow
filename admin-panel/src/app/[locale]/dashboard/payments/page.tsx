import PaymentsDashboard from '@/components/admin/PaymentsDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payments - GateFlow Admin',
};

export default function PaymentsPage() {
  return <PaymentsDashboard />;
}