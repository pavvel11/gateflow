// lib/stripe/client.ts
// DEPRECATED: Use useStripe() hook from client-hook.ts instead

/**
 * DEPRECATED: Use useStripe() hook from client-hook.ts instead
 * This function is deprecated and should not be used in new code
 */
export const getStripe = () => {
  throw new Error('getStripe() is deprecated. Use useStripe() hook from @/lib/stripe/client-hook instead.');
};
