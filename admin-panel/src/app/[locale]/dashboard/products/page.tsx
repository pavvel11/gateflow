import ProductsPageContent from '@/components/ProductsPageContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products - Sellf Admin',
};

export default function ProductsPage() {
  return <ProductsPageContent />;
}