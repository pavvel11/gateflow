/**
 * GUS API Key Encryption
 *
 * Reuses existing encryption infrastructure (AES-256-GCM) for securing GUS API keys.
 * The same APP_ENCRYPTION_KEY from environment is used to encrypt/decrypt.
 */

import { encryptStripeKey, decryptStripeKey } from './stripe-encryption';

/**
 * Encrypts GUS API key using the same encryption as Stripe keys
 */
export const encryptGUSKey = encryptStripeKey;

/**
 * Decrypts GUS API key using the same decryption as Stripe keys
 */
export const decryptGUSKey = decryptStripeKey;
