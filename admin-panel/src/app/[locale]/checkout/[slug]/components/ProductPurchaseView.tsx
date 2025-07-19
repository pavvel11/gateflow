'use client';

import { Product } from '@/types';
import FreeProductForm from './FreeProductForm';
import PaidProductForm from './PaidProductForm';
import FloatingToolbar from '@/components/FloatingToolbar';

interface ProductPurchaseViewProps {
  product: Product;
}

export default function ProductPurchaseView({ product }: ProductPurchaseViewProps) {
  return (
    <div>
      {/* Unified Floating Toolbar */}
      <FloatingToolbar position="top-right" />
      
      {/* Route to appropriate form based on product type */}
      {product.price === 0 ? (
        <FreeProductForm product={product} />
      ) : (
        <PaidProductForm product={product} />
      )}
    </div>
  );
}
