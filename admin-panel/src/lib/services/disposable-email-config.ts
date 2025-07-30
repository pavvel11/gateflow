/**
 * Configuration for disposable email domain filtering
 */

export interface DisposableEmailConfig {
  /** Whether to enable disposable email domain filtering */
  enabled: boolean;
  
  /** Whether to allow disposable emails in development mode */
  allowInDevelopment: boolean;
  
  /** Cache duration for domains list in milliseconds (default: 24 hours) */
  cacheDuration: number;
  
  /** Custom domains to block (in addition to the standard list) */
  customBlockedDomains: string[];
  
  /** Domains to whitelist (won't be blocked even if in disposable list) */
  whitelistedDomains: string[];
}

/**
 * Get configuration from environment variables
 */
export function getDisposableEmailConfig(): DisposableEmailConfig {
  return {
    enabled: process.env.DISPOSABLE_EMAIL_FILTER_ENABLED !== 'false',
    allowInDevelopment: process.env.DISPOSABLE_EMAIL_ALLOW_IN_DEV === 'true',
    cacheDuration: parseInt(process.env.DISPOSABLE_EMAIL_CACHE_TTL || '24') * 60 * 60 * 1000, // TTL in hours, default: 24h
    customBlockedDomains: process.env.DISPOSABLE_EMAIL_BLACKLIST?.split(',').map(d => d.trim()).filter(d => d.length > 0) || [],
    whitelistedDomains: process.env.DISPOSABLE_EMAIL_WHITELIST?.split(',').map(d => d.trim()).filter(d => d.length > 0) || [],
  };
}
