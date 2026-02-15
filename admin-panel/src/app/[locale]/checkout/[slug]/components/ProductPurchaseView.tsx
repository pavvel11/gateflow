'use client';

import { Product } from '@/types';
import { ExpressCheckoutConfig } from '@/types/payment-config';
import FreeProductForm from './FreeProductForm';
import PaidProductForm from './PaidProductForm';
import WaitlistForm from '@/components/WaitlistForm';
import FloatingToolbar from '@/components/FloatingToolbar';

interface ProductPurchaseViewProps {
  product: Product;
  paymentMethodOrder?: string[];
  expressCheckoutConfig?: ExpressCheckoutConfig;
}

type UnavailableReason = 'not_started' | 'expired' | 'inactive' | null;

function getProductUnavailableReason(product: Product): UnavailableReason {
  const now = new Date();

  // Check temporal availability first
  if (product.available_from) {
    const availableFrom = new Date(product.available_from);
    if (now < availableFrom) {
      return 'not_started';
    }
  }

  if (product.available_until) {
    const availableUntil = new Date(product.available_until);
    if (now > availableUntil) {
      return 'expired';
    }
  }

  // Check is_active flag
  if (!product.is_active) {
    return 'inactive';
  }

  return null; // Product is available
}

export default function ProductPurchaseView({ product, paymentMethodOrder, expressCheckoutConfig }: ProductPurchaseViewProps) {
  const unavailableReason = getProductUnavailableReason(product);

  // Show waitlist form if product is unavailable AND waitlist is enabled
  const showWaitlist = unavailableReason !== null && product.enable_waitlist;

  return (
    <div>
      {/* Unified Floating Toolbar */}
      <FloatingToolbar position="top-right" />

      {showWaitlist ? (
        <WaitlistForm product={product} unavailableReason={unavailableReason} />
      ) : product.price === 0 ? (
        <FreeProductForm product={product} />
      ) : (
        <PaidProductForm product={product} paymentMethodOrder={paymentMethodOrder} expressCheckoutConfig={expressCheckoutConfig} />
      )}
    </div>
  );
}
