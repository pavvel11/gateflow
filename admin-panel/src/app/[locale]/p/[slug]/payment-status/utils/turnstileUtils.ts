/**
 * Utility functions for Turnstile captcha behavior detection
 */

// Cloudflare dummy sitekeys for testing - type definition
type TurnstileTestMode = 
  | 'ALWAYS_PASSES_VISIBLE'
  | 'ALWAYS_BLOCKS_VISIBLE' 
  | 'ALWAYS_PASSES_INVISIBLE'
  | 'ALWAYS_BLOCKS_INVISIBLE'
  | 'INTERACTIVE_CHALLENGE';

/**
 * Determines if a Turnstile widget should be shown in visible mode (yellow block)
 * vs invisible mode (hidden widget)
 */
export function shouldShowVisibleCaptcha(): boolean {
  if (process.env.NODE_ENV !== 'development') {
    // In production, assume visible widget for better UX
    return true;
  }
  
  const testMode = process.env.NEXT_PUBLIC_TURNSTILE_TEST_MODE as TurnstileTestMode;
  
  // Visible modes: INTERACTIVE_CHALLENGE, ALWAYS_PASSES_VISIBLE, ALWAYS_BLOCKS_VISIBLE
  // Invisible modes: ALWAYS_PASSES_INVISIBLE, ALWAYS_BLOCKS_INVISIBLE
  return testMode === 'INTERACTIVE_CHALLENGE' || 
         testMode === 'ALWAYS_PASSES_VISIBLE' || 
         testMode === 'ALWAYS_BLOCKS_VISIBLE' ||
         !testMode; // Default to visible if not set
}

/**
 * Determines if we should show both terms and captcha simultaneously
 * instead of waiting for interactive challenge trigger
 */
export function shouldShowBothSimultaneously(): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return true; // In production, show both for better UX
  }
  
  const testMode = process.env.NEXT_PUBLIC_TURNSTILE_TEST_MODE as TurnstileTestMode;
  
  // Show both simultaneously for visible modes (except INTERACTIVE_CHALLENGE which has special flow)
  return testMode === 'ALWAYS_PASSES_VISIBLE' || 
         testMode === 'ALWAYS_BLOCKS_VISIBLE';
}
