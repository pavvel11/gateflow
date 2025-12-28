/**
 * Polish NIP (Numer Identyfikacji Podatkowej) validation
 *
 * NIP is a 10-digit tax identification number used in Poland.
 * The last digit is a checksum calculated using a weighted sum algorithm.
 */

/**
 * Normalizes NIP by removing dashes and spaces
 * Example: "123-456-78-90" → "1234567890"
 */
export function normalizeNIP(nip: string): string {
  return nip.replace(/[-\s]/g, '');
}

/**
 * Formats NIP as XXX-XXX-XX-XX
 * Example: "1234567890" → "123-456-78-90"
 */
export function formatNIP(nip: string): string {
  const normalized = normalizeNIP(nip);
  if (normalized.length !== 10) return nip;

  return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6, 8)}-${normalized.slice(8, 10)}`;
}

/**
 * Validates NIP checksum using Polish algorithm
 *
 * Algorithm:
 * 1. Weights: [6, 5, 7, 2, 3, 4, 5, 6, 7]
 * 2. Multiply each of first 9 digits by corresponding weight
 * 3. Sum all products
 * 4. Calculate modulo 11
 * 5. Result must equal 10th digit
 * 6. If modulo = 10, NIP is invalid
 *
 * @param nip - NIP number (can include dashes/spaces)
 * @returns true if checksum is valid
 */
export function validateNIPChecksum(nip: string): boolean {
  const normalized = normalizeNIP(nip);

  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(normalized)) {
    return false;
  }

  // Weights for checksum calculation
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];

  // Calculate checksum
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(normalized[i]) * weights[i];
  }

  const checksum = sum % 11;

  // If checksum is 10, NIP is invalid
  if (checksum === 10) {
    return false;
  }

  // Checksum must match 10th digit
  return checksum === parseInt(normalized[9]);
}

/**
 * Validates NIP format and checksum
 *
 * @returns validation result with normalized/formatted NIP or error
 */
export interface NIPValidationResult {
  isValid: boolean;
  normalized?: string;  // e.g., "1234567890"
  formatted?: string;   // e.g., "123-456-78-90"
  error?: string;
}

export function validateNIP(nip: string): NIPValidationResult {
  if (!nip || nip.trim().length === 0) {
    return {
      isValid: false,
      error: 'NIP is required'
    };
  }

  const normalized = normalizeNIP(nip);

  if (!/^\d{10}$/.test(normalized)) {
    return {
      isValid: false,
      error: 'NIP must be 10 digits'
    };
  }

  if (!validateNIPChecksum(normalized)) {
    return {
      isValid: false,
      error: 'Invalid NIP checksum'
    };
  }

  return {
    isValid: true,
    normalized,
    formatted: formatNIP(normalized)
  };
}
