import VariantsPageContent from '@/components/VariantsPageContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Variants - GateFlow Admin',
};

export default function VariantsPage() {
  return <VariantsPageContent />;
}
