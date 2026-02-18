'use client';

import { useEffect, useRef } from 'react';
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
 *
 * Priority: user manual toggle (sessionStorage) > admin force > system default.
 * If user clicks the theme toggle on checkout, their choice persists for the session.
 * On next session (or cleared sessionStorage), admin's default applies again.
 */
const CHECKOUT_USER_OVERRIDE_KEY = 'gf_checkout_theme_user';

function useForceCheckoutTheme(checkoutTheme?: string) {
  const { setTheme } = useTheme();
  const skipNextEvent = useRef(false);

  // Apply admin's default on mount — only if user hasn't overridden in this session
  useEffect(() => {
    if (!checkoutTheme || checkoutTheme === 'system') return;

    const userOverride = sessionStorage.getItem(CHECKOUT_USER_OVERRIDE_KEY);
    if (userOverride) {
      // User already toggled manually in this session — respect their choice
      skipNextEvent.current = true;
      setTheme(userOverride as 'light' | 'dark' | 'system');
      return;
    }

    // Mark next event as "ours" so the listener ignores it
    skipNextEvent.current = true;
    setTheme(checkoutTheme as 'light' | 'dark');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutTheme]);

  // Track user manual toggles via custom event from theme-provider
  useEffect(() => {
    if (!checkoutTheme || checkoutTheme === 'system') return;

    const handler = (e: Event) => {
      if (skipNextEvent.current) {
        skipNextEvent.current = false;
        return; // This was our forced setTheme, not user action
      }
      const newTheme = (e as CustomEvent).detail;
      if (newTheme) {
        sessionStorage.setItem(CHECKOUT_USER_OVERRIDE_KEY, newTheme);
      }
    };

    window.addEventListener('gf-theme-change', handler);
    return () => window.removeEventListener('gf-theme-change', handler);
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
