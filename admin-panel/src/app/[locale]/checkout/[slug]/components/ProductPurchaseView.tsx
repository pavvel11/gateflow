'use client';

import { Product } from '@/types';
import FreeProductForm from './FreeProductForm';
import PaidProductForm from './PaidProductForm';

interface ProductPurchaseViewProps {
  product: Product;
}

export default function ProductPurchaseView({ product }: ProductPurchaseViewProps) {
  // Route to appropriate form based on product type
  if (product.price === 0) {
    return <FreeProductForm product={product} />;
  } else {
    return <PaidProductForm product={product} />;
  }
}
