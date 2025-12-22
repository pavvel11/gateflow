import CouponsPageContent from '@/components/CouponsPageContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Coupons - GateFlow Admin',
};

export default function CouponsPage() {
  return <CouponsPageContent />;
}