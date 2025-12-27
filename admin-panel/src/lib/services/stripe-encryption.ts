/**
 * Stripe API Key Encryption Service
 *
 * Implements AES-256-GCM encryption for secure storage of Stripe API keys in the database.
 * Uses the STRIPE_ENCRYPTION_KEY environment variable for encryption/decryption.
 *
 * Security features:
 * - AES-256-GCM authenticated encryption
 * - Random initialization vector (IV) per encryption
 * - Authentication tag for integrity verification
 * - Base64 encoding for database storage
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Result of encryption operation
 */
export interface EncryptionResult {
  encryptedKey: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  tag: string; // Base64 encoded authentication tag
}

/**
 * Configuration for decryption
 */
export interface EncryptedConfig {
  encrypted_key: string;
  encryption_iv: string;
  encryption_tag: string;
}

/**
 * Validates that the encryption key is properly configured
 * @throws {Error} if STRIPE_ENCRYPTION_KEY is missing or invalid
 */
function validateEncryptionKey(): Buffer {
  const encryptionKey = process.env.STRIPE_ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error(
      'STRIPE_ENCRYPTION_KEY is not configured. Generate one with: openssl rand -base64 32'
    );
  }

  try {
    const keyBuffer = Buffer.from(encryptionKey, 'base64');

    // AES-256 requires 32 bytes
    if (keyBuffer.length !== 32) {
      throw new Error(
        `STRIPE_ENCRYPTION_KEY must be 32 bytes (256 bits). Current length: ${keyBuffer.length} bytes. ` +
        'Generate a new key with: openssl rand -base64 32'
      );
    }

    return keyBuffer;
  } catch (error) {
    if (error instanceof Error && error.message.includes('must be 32 bytes')) {
      throw error;
    }
    throw new Error(
      'STRIPE_ENCRYPTION_KEY is not valid base64. Generate a new key with: openssl rand -base64 32'
    );
  }
}

/**
 * Encrypts a Stripe API key using AES-256-GCM
 *
 * @param plaintext - The Stripe API key to encrypt (e.g., rk_test_xxx or rk_live_xxx)
 * @returns Encryption result with encrypted key, IV, and auth tag (all base64 encoded)
 * @throws {Error} if encryption fails or STRIPE_ENCRYPTION_KEY is invalid
 *
 * @example
 * ```typescript
 * const result = await encryptStripeKey('rk_test_abc123...');
 * // Save result.encryptedKey, result.iv, result.tag to database
 * ```
 */
export async function encryptStripeKey(plaintext: string): Promise<EncryptionResult> {
  if (!plaintext || plaintext.trim().length === 0) {
    throw new Error('Cannot encrypt empty key');
  }

  try {
    const key = validateEncryptionKey();

    // Generate random IV for this encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag for integrity verification
    const tag = cipher.getAuthTag();

    return {
      encryptedKey: encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
    throw new Error('Encryption failed: Unknown error');
  }
}

/**
 * Decrypts a Stripe API key using AES-256-GCM
 *
 * @param config - Object containing encrypted_key, encryption_iv, and encryption_tag
 * @returns The decrypted Stripe API key
 * @throws {Error} if decryption fails, auth tag verification fails, or key is invalid
 *
 * @example
 * ```typescript
 * const decrypted = await decryptStripeKey({
 *   encrypted_key: 'base64_encrypted_data',
 *   encryption_iv: 'base64_iv',
 *   encryption_tag: 'base64_tag'
 * });
 * // Use decrypted key with Stripe SDK
 * ```
 */
export async function decryptStripeKey(config: EncryptedConfig): Promise<string> {
  if (!config.encrypted_key || !config.encryption_iv || !config.encryption_tag) {
    throw new Error('Missing required encryption parameters');
  }

  try {
    const key = validateEncryptionKey();

    // Decode base64 values
    const iv = Buffer.from(config.encryption_iv, 'base64');
    const tag = Buffer.from(config.encryption_tag, 'base64');

    // Validate IV and tag lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: ${iv.length} bytes (expected ${IV_LENGTH})`);
    }
    if (tag.length !== TAG_LENGTH) {
      throw new Error(`Invalid tag length: ${tag.length} bytes (expected ${TAG_LENGTH})`);
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // Set authentication tag for verification
    decipher.setAuthTag(tag);

    // Decrypt the data
    let decrypted = decipher.update(config.encrypted_key, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    if (error instanceof Error) {
      // Authentication tag verification failure indicates data tampering or corruption
      if (error.message.includes('Unsupported state or unable to authenticate data')) {
        throw new Error(
          'Decryption failed: Authentication tag verification failed. ' +
          'Data may be corrupted or tampered with.'
        );
      }
      throw new Error(`Decryption failed: ${error.message}`);
    }
    throw new Error('Decryption failed: Unknown error');
  }
}

/**
 * Tests encryption/decryption round-trip to verify configuration
 *
 * @returns true if encryption is working correctly
 * @throws {Error} if encryption test fails
 *
 * @example
 * ```typescript
 * // Verify encryption is configured correctly at startup
 * await testEncryption();
 * ```
 */
export async function testEncryption(): Promise<boolean> {
  const testData = 'rk_test_abc123def456ghi789jkl012mno345';

  try {
    // Encrypt
    const encrypted = await encryptStripeKey(testData);

    // Decrypt
    const decrypted = await decryptStripeKey({
      encrypted_key: encrypted.encryptedKey,
      encryption_iv: encrypted.iv,
      encryption_tag: encrypted.tag,
    });

    // Verify round-trip
    if (decrypted !== testData) {
      throw new Error('Decrypted value does not match original');
    }

    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Encryption test failed: ${error.message}`);
    }
    throw new Error('Encryption test failed: Unknown error');
  }
}
