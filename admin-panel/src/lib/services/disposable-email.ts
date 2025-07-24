/**
 * Disposable Email Domain Validation Service
 * 
 * This service provides functionality to detect and block disposable/temporary
 * email addresses commonly used for spam and fake registrations.
 * 
 * Data source: https://github.com/unkn0w/disposable-email-domain-list
 * License: MIT
 */

import { getDisposableEmailConfig } from './disposable-email-config';
import { promises as fs } from 'fs';
import path from 'path';

export class DisposableEmailService {
  private static domains: Set<string> | null = null;
  private static lastFetch: number = 0;
  private static config = getDisposableEmailConfig();
  private static readonly RAW_URL = 'https://raw.githubusercontent.com/unkn0w/disposable-email-domain-list/main/domains.json';
  private static readonly CACHE_FILE = path.join(process.cwd(), '.cache', 'disposable-domains.json');
  private static readonly CACHE_META_FILE = path.join(process.cwd(), '.cache', 'disposable-domains-meta.json');

  /**
   * Ensure cache directory exists
   */
  private static async ensureCacheDir(): Promise<void> {
    const cacheDir = path.dirname(this.CACHE_FILE);
    try {
      await fs.mkdir(cacheDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create cache directory:', error);
    }
  }

  /**
   * Load domains from local cache
   */
  private static async loadFromCache(): Promise<boolean> {
    try {
      const [domainsContent, metaContent] = await Promise.all([
        fs.readFile(this.CACHE_FILE, 'utf8'),
        fs.readFile(this.CACHE_META_FILE, 'utf8')
      ]);

      const domains = JSON.parse(domainsContent);
      const meta = JSON.parse(metaContent);

      // Check if cache is still valid (1 week = 604800000 ms)
      const now = Date.now();
      if (now - meta.timestamp < 604800000) {
        this.domains = new Set(domains);
        this.lastFetch = meta.timestamp;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Load domains from expired cache as fallback
   */
  private static async loadExpiredCacheAsFallback(): Promise<boolean> {
    try {
      const [domainsContent, metaContent] = await Promise.all([
        fs.readFile(this.CACHE_FILE, 'utf8'),
        fs.readFile(this.CACHE_META_FILE, 'utf8')
      ]);

      const domains = JSON.parse(domainsContent);
      const meta = JSON.parse(metaContent);
      this.domains = new Set(domains);
      this.lastFetch = meta.timestamp;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save domains to local cache
   */
  private static async saveToCache(domains: Set<string>): Promise<void> {
    try {
      await this.ensureCacheDir();
      
      const domainsArray = Array.from(domains);
      const meta = { 
        timestamp: Date.now(), 
        count: domains.size,
        source: 'github',
        version: '1.0'
      };

      await Promise.all([
        fs.writeFile(this.CACHE_FILE, JSON.stringify(domainsArray), 'utf8'),
        fs.writeFile(this.CACHE_META_FILE, JSON.stringify(meta, null, 2), 'utf8')
      ]);

    } catch (error) {
      console.error('Failed to save domains to cache:', error);
    }
  }

  /**
   * Initialize the service with disposable domain list
   */
  private static async initialize(): Promise<void> {
    const now = Date.now();
    
    // Skip if memory cache is still fresh (1 week = 604800000 ms)
    if (this.domains && (now - this.lastFetch) < 604800000) {
      return;
    }

    // Try to load from filesystem cache first
    if (await this.loadFromCache()) {
      return;
    }

    try {
      // Fetch from the raw GitHub URL
      const response = await fetch(this.RAW_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch domains: ${response.status}`);
      }
      
      // Direct JSON response from raw URL
      const domains = await response.json();
      this.domains = new Set(domains);
      
      this.lastFetch = now;
      // Save to cache for next time
      await this.saveToCache(this.domains);
      
    } catch (error) {
      console.error('❌ Failed to load disposable email domains:', error);
      
      // Try to use expired cache as fallback before using hardcoded list
      if (await this.loadExpiredCacheAsFallback()) {
        return;
      }
      
      // Use a basic fallback list of common disposable domains if everything fails
      if (!this.domains) {
        this.domains = new Set([
          '10minutemail.com',
          'guerrillamail.com',
          'mailinator.com',
          'tempmail.org',
          'temp-mail.org',
          'yopmail.com',
          'throwaway.email',
          'sharklasers.com',
          'getairmail.com',
          'trashmail.com'
        ]);
      }
    }
  }

  /**
   * Check if an email address uses a disposable domain
   * 
   * @param email - The email address to check
   * @returns true if the email uses a disposable domain, false otherwise
   */
  static async isDisposableEmail(email: string): Promise<boolean> {
    // Return false if filtering is disabled
    if (!this.config.enabled) {
      return false;
    }

    // Allow disposable emails in development if configured
    if (process.env.NODE_ENV === 'development' && this.config.allowInDevelopment) {
      return false;
    }

    if (!email || typeof email !== 'string') {
      return false;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    // Extract domain from email
    const domain = email.toLowerCase().split('@')[1];
    if (!domain) {
      return false;
    }

    // Check whitelist first
    if (this.config.whitelistedDomains.includes(domain)) {
      return false;
    }

    // Check custom blacklist
    if (this.config.customBlockedDomains.includes(domain)) {
      return true;
    }

    // Initialize domains if needed
    await this.initialize();

    const isDisposable = this.domains!.has(domain);
    return isDisposable;
  }

  /**
   * Validate email address and check for disposable domains
   * 
   * @param email - The email address to validate
   * @param allowDisposable - Whether to allow disposable email addresses (default: false)
   * @returns object with validation result and details
   */
  static async validateEmail(email: string, allowDisposable: boolean = false): Promise<{
    isValid: boolean;
    isDisposable: boolean;
    error?: string;
  }> {
    if (!email || typeof email !== 'string') {
      return {
        isValid: false,
        isDisposable: false,
        error: 'Email is required'
      };
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        isDisposable: false,
        error: 'Invalid email format'
      };
    }

    // Check for disposable domain
    const isDisposable = await this.isDisposableEmail(email);
    
    if (isDisposable && !allowDisposable) {
      return {
        isValid: false,
        isDisposable: true,
        error: 'Disposable email addresses are not allowed'
      };
    }

    return {
      isValid: true,
      isDisposable,
    };
  }

  /**
   * Get the number of loaded disposable domains
   * Useful for debugging and monitoring
   */
  static getDomainCount(): number {
    return this.domains?.size || 0;
  }

  /**
   * Clear the domain cache to force refresh on next use
   */
  static clearCache(): void {
    this.domains = null;
    this.lastFetch = 0;
  }

  /**
   * Force refresh domains from GitHub (ignores cache)
   */
  static async forceRefresh(): Promise<void> {
    this.domains = null;
    this.lastFetch = 0;
    await this.initialize();
  }

  /**
   * Clear filesystem cache files
   */
  static async clearFileCache(): Promise<void> {
    try {
      await Promise.all([
        fs.unlink(this.CACHE_FILE).catch(() => {}),
        fs.unlink(this.CACHE_META_FILE).catch(() => {})
      ]);
    } catch (error) {
      console.error('Failed to clear filesystem cache:', error);
    }
  }

  /**
   * Get cache info for debugging
   */
  static async getCacheInfo(): Promise<{
    exists: boolean;
    age?: number;
    count?: number;
    isValid?: boolean;
  }> {
    try {
      const metaContent = await fs.readFile(this.CACHE_META_FILE, 'utf8');
      const meta = JSON.parse(metaContent);
      const age = Date.now() - meta.timestamp;
      const isValid = age < 604800000; // 1 week
      
      return {
        exists: true,
        age: Math.round(age / 86400000), // days
        count: meta.count,
        isValid
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Check if a specific domain is in the disposable list
   * 
   * @param domain - The domain to check (without @ symbol)
   * @returns true if domain is disposable, false otherwise
   */
  static async isDomainDisposable(domain: string): Promise<boolean> {
    if (!domain || typeof domain !== 'string') {
      return false;
    }

    await this.initialize();
    return this.domains!.has(domain.toLowerCase());
  }
}
