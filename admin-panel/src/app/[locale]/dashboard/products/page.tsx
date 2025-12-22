import ProductsPageContent from '@/components/ProductsPageContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products - GateFlow Admin',
};

export default function ProductsPage() {
  return <ProductsPageContent />;
}