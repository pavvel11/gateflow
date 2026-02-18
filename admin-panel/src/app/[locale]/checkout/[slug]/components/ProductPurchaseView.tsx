'use client';

import { useEffect } from 'react';
import { Product } from '@/types';
import { ExpressCheckoutConfig } from '@/types/payment-config';
import FreeProductForm from './FreeProductForm';
import PaidProductForm from './PaidProductForm';
import WaitlistForm from '@/components/WaitlistForm';
import FloatingToolbar from '@/components/FloatingToolbar';
import { DemoResetCountdown } from '@/components/DemoCheckoutNotice';
import GateFlowBranding from '@/components/GateFlowBranding';
import { useTheme } from '@/components/providers/theme-provider';

interface ProductPurchaseViewProps {
  product: Product;
  paymentMethodOrder?: string[];
  expressCheckoutConfig?: ExpressCheckoutConfig;
  checkoutTheme?: string;
  licenseValid?: boolean;
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

/**
 * Override theme on checkout page based on admin's shop_config.checkout_theme setting.
 * When force is 'light' or 'dark', it overrides the user's preference for this page only.
 * On unmount, the original theme is restored.
 */
function useForceCheckoutTheme(checkoutTheme?: string) {
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    if (!checkoutTheme || checkoutTheme === 'system') return;

    // Save current user theme to restore on unmount
    const originalTheme = theme;

    if (checkoutTheme === 'light' || checkoutTheme === 'dark') {
      setTheme(checkoutTheme);
    }

    return () => {
      // Restore user's original theme when leaving checkout
      setTheme(originalTheme);
    };
    // Only run on mount — don't re-trigger when theme changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutTheme]);
}

export default function ProductPurchaseView({ product, paymentMethodOrder, expressCheckoutConfig, checkoutTheme, licenseValid }: ProductPurchaseViewProps) {
  const unavailableReason = getProductUnavailableReason(product);
  useForceCheckoutTheme(checkoutTheme);

  // Show waitlist form if product is unavailable AND waitlist is enabled
  const showWaitlist = unavailableReason !== null && product.enable_waitlist;

  return (
    <div>
      {/* Unified Floating Toolbar */}
      <FloatingToolbar position="top-right" />
      <DemoResetCountdown />

      {showWaitlist ? (
        <WaitlistForm product={product} unavailableReason={unavailableReason} />
      ) : product.price === 0 ? (
        <FreeProductForm product={product} />
      ) : (
        <PaidProductForm product={product} paymentMethodOrder={paymentMethodOrder} expressCheckoutConfig={expressCheckoutConfig} />
      )}

      {/* GateFlow branding — hidden when a valid license is active */}
      {!licenseValid && <GateFlowBranding />}
    </div>
  );
}
