/**
 * GateFlow - Professional Content Access Control System
 * Version 1.0.0 - Complete Refactor
 * 
 * 🎯 FEATURES:
 * • Domain-based licensing with watermark system
 * • Multi-mode content protection (page/element/toggle)
 * • Supabase integration for user authentication
 * • Advanced caching and performance optimization
 * • Comprehensive analytics and event tracking
 * • Robust error handling and security measures
 * 
 * 📋 USAGE:
 * Served dynamically via /api/gatekeeper endpoint
 * Configuration automatically injected by GatekeeperGenerator
 * 
 * 📄 LICENSE: Freemium - Free with watermark, $49/domain/year for removal
 * 🌐 Website: https://gateflow.pl | 📧 Support: support@gateflow.pl
 */

// ============================================================================
// CORE CONSTANTS & CONFIGURATION
// ============================================================================

const CONSTANTS = {
    VERSION: '1.0.0',
    CACHE_TTL: 300000, // 5 minutes
    LICENSE_CHECK_INTERVAL: 86400000, // 24 hours
    QUERY_TIMEOUT: 3000,
    MAX_RETRIES: 3,
    PROCESSING_DELAY: 100,
    
    // Database errors
    DUPLICATE_KEY_ERROR: '23505',
    
    // License endpoints
    LICENSE_ENDPOINTS: [
        'https://api.gateflow.pl/license/verify',
        'https://license.gateflow.pl/v1/check',
        'https://gateflow-licensing.vercel.app/api/verify'
    ],
    
    // Event names
    EVENTS: {
        ACCESS_GRANTED: 'gateflow_access_granted',
        ACCESS_DENIED: 'gateflow_access_denied',
        LOGIN_SHOWN: 'gateflow_login_shown',
        MAGIC_LINK_SENT: 'gateflow_magic_link_sent',
        FREE_ACCESS_GRANTED: 'gateflow_free_access_granted',
        ELEMENT_PROTECTED: 'gateflow_element_protected',
        ELEMENT_ACCESSED: 'gateflow_element_accessed',
        BATCH_CHECK: 'gateflow_batch_check',
        ERROR: 'gateflow_error',
        PERFORMANCE: 'gateflow_performance',
        LICENSE_CHECK: 'gateflow_license_check',
        LICENSE_VIOLATION: 'gateflow_license_violation'
    },
    
    // Fallback modes
    FALLBACK_MODES: {
        SHOW_ALL: 'show_all',
        HIDE_ALL: 'hide_all', 
        SHOW_FREE: 'show_free'
    }
};

// ============================================================================
// CORE CLASSES
// ============================================================================

/**
 * Advanced caching system with TTL and performance optimization
 */
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
    }
    
    generateKey(type, ...args) {
        return `${type}_${args.join('_')}`;
    }
    
    get(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > CONSTANTS.CACHE_TTL) {
            this.cache.delete(key);
            return null;
        }
        
        Analytics.track(CONSTANTS.EVENTS.PERFORMANCE, { 
            action: 'cache_hit', 
            key: key.split('_')[0] 
        });
        return cached.data;
    }
    
    set(key, data, ttl = CONSTANTS.CACHE_TTL) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }
    
    delete(key) {
        this.cache.delete(key);
    }
    
    clear() {
        this.cache.clear();
    }
    
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }
    
    destroy() {
        clearInterval(this.cleanupInterval);
        this.clear();
    }
}

/**
 * Comprehensive analytics and event tracking system
 */
class Analytics {
    static track(event, data = {}) {
        try {
            const eventData = {
                ...data,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                gateflow_version: CONSTANTS.VERSION,
                license_status: LicenseManager.getStatus().valid ? 'licensed' : 'unlicensed',
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                user_id: SessionManager.getCurrentUserId(),
                session_duration: SessionManager.getSessionDuration(),
                performance: {
                    memory: performance.memory ? {
                        used: performance.memory.usedJSHeapSize,
                        total: performance.memory.totalJSHeapSize
                    } : null,
                    timing: performance.timing ? {
                        load: performance.timing.loadEventEnd - performance.timing.navigationStart
                    } : null
                }
            };
            
            // Add device info
            if (navigator.userAgentData?.platform) {
                eventData.platform = navigator.userAgentData.platform;
            }
            
            // Send to analytics providers
            this.sendToProviders(event, eventData);
            
        } catch (error) {
            // Silent error handling
        }
    }
    
    static sendToProviders(event, data) {
        // Google Analytics
        if (window.gtag) {
            window.gtag('event', event, data);
        }
        
        // Segment
        if (window.analytics) {
            window.analytics.track(event, data);
        }
        
        // Facebook Pixel
        if (window.fbq) {
            window.fbq('trackCustom', event, data);
        }
        
        // Custom analytics endpoint
        const config = this.getConfig();
        if (config.analyticsEndpoint) {
            try {
                fetch(config.analyticsEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event, data })
                });
            } catch (e) {
                // Silent error handling
            }
        }
    }
    
    static getConfig() {
        return window.gatekeeperConfig || {};
    }
}

/**
 * Domain fingerprinting and license verification system
 */
class LicenseManager {
    static status = { valid: false, domain: null, expires: null, showWatermark: true };
    
    static getDomainFingerprint() {
        const { hostname, protocol, port } = window.location;
        const fingerprint = `${protocol}//${hostname}${port ? ':' + port : ''}`;
        
        // Enhanced fingerprinting
        const { userAgent, language } = navigator;
        const platformInfo = navigator.userAgentData?.platform || this.getPlatformFromUA(userAgent);
        
        const combined = `${fingerprint}|${userAgent.slice(0, 50)}|${language}|${platformInfo}`;
        
        // Simple but effective hash
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash) + combined.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(16);
    }
    
    static getPlatformFromUA(ua) {
        const lower = ua.toLowerCase();
        if (lower.includes('win')) return 'windows';
        if (lower.includes('mac')) return 'macos';
        if (lower.includes('linux')) return 'linux';
        if (lower.includes('android')) return 'android';
        if (lower.includes('iphone') || lower.includes('ipad')) return 'ios';
        return 'unknown';
    }
    
    static obfuscate(str) {
        return btoa(str).split('').reverse().join('');
    }
    
    static deobfuscate(str) {
        return atob(str.split('').reverse().join(''));
    }
    
    static async checkLicense() {
        const config = window.gatekeeperConfig || {};
        const licenseKey = config.gateflowLicense;
        
        if (!licenseKey) {
            this.status = { valid: false, showWatermark: true };
            return false;
        }
        
        // Check cache first
        const cacheKey = cache.generateKey('license', this.getDomainFingerprint());
        const cached = cache.get(cacheKey);
        if (cached) {
            this.status = cached;
            return cached.valid;
        }
        
        try {
            const result = await this.verifyWithEndpoints(licenseKey);
            
            if (result.valid) {
                this.status = {
                    valid: true,
                    domain: window.location.hostname,
                    expires: result.expires,
                    showWatermark: false,
                    plan: result.plan || 'pro'
                };
                
                cache.set(cacheKey, this.status, CONSTANTS.LICENSE_CHECK_INTERVAL);
                
                Analytics.track(CONSTANTS.EVENTS.LICENSE_CHECK, {
                    status: 'valid',
                    domain: window.location.hostname,
                    plan: result.plan
                });
                
                return true;
            } else {
                this.status = { valid: false, showWatermark: true, violation: 'invalid_license' };
                Analytics.track(CONSTANTS.EVENTS.LICENSE_VIOLATION, {
                    domain: window.location.hostname,
                    reason: 'invalid_license'
                });
                return false;
            }
        } catch (error) {
            this.status = { valid: false, showWatermark: true, violation: 'check_failed' };
            return false;
        }
    }
    
    static async verifyWithEndpoints(licenseKey) {
        const domain = window.location.hostname;
        const fingerprint = this.getDomainFingerprint();
        
        const payload = {
            license: this.obfuscate(licenseKey),
            domain: this.obfuscate(domain),
            fingerprint,
            timestamp: Date.now(),
            version: CONSTANTS.VERSION
        };
        
        for (const endpoint of CONSTANTS.LICENSE_ENDPOINTS) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-GateFlow-Version': CONSTANTS.VERSION
                    },
                    body: JSON.stringify(payload)
                });
                
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                // Silent error handling
            }
        }
        
        throw new Error('All license endpoints failed');
    }
    
    static getStatus() {
        return this.status;
    }
    
    static createWatermark() {
        if (this.status.valid) return;
        
        const watermark = document.createElement('div');
        watermark.id = 'gateflow-watermark';
        watermark.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                font-weight: 600;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
                z-index: 999999;
                cursor: pointer;
                transition: all 0.3s ease;
                user-select: none;
            " onmouseover="this.style.transform='scale(1.05)'" 
               onmouseout="this.style.transform='scale(1)'" 
               onclick="window.open('https://gateflow.pl/pricing', '_blank')">
                <span style="margin-right: 8px;">🔐</span>
                Secured by <strong>GateFlow</strong> v${CONSTANTS.VERSION}
                <div style="font-size: 10px; opacity: 0.8; margin-top: 2px;">
                    Get license to remove this notice
                </div>
            </div>
        `;
        
        document.body.appendChild(watermark);
        
        // Anti-tampering protection
        this.protectWatermark();
    }
    
    static protectWatermark() {
        const observer = new MutationObserver(() => {
            if (!document.getElementById('gateflow-watermark') && !this.status.valid) {
                this.createWatermark();
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Periodic check
        setInterval(() => {
            if (!document.getElementById('gateflow-watermark') && !this.status.valid) {
                this.createWatermark();
            }
        }, 5000);
    }
}

/**
 * User session and authentication management
 */
class SessionManager {
    static currentUserId = null;
    static sessionStartTime = null;
    static accessGrantedTime = null;
    static supabaseClient = null;
    
    static initialize(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.sessionStartTime = Date.now();
        
        // Handle session from URL hash (magic link callback)
        this.handleSessionFromUrl();
        
        // Check for existing session
        this.initializeCurrentSession();
        
        // Listen for auth state changes
        this.supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                this.currentUserId = session.user.id;
                this.accessGrantedTime = Date.now();
                
                Analytics.track(CONSTANTS.EVENTS.ACCESS_GRANTED, {
                    user_id: this.currentUserId,
                    event_type: event
                });
                
                // Clean up URL after successful login
                if (event === 'SIGNED_IN' && window.location.hash) {
                    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
                }
            } else {
                this.currentUserId = null;
                this.accessGrantedTime = null;
                
                Analytics.track(CONSTANTS.EVENTS.ACCESS_DENIED, {
                    event_type: event
                });
            }
        });
    }
    
    static async initializeCurrentSession() {
        try {
            const { data: { session } } = await this.supabaseClient.auth.getSession();
            if (session?.user) {
                this.currentUserId = session.user.id;
                this.accessGrantedTime = Date.now();
            }
        } catch (error) {
            // Silent error handling
        }
    }
    
    static handleSessionFromUrl() {
        // Check if we have session tokens in URL hash
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
            try {
                // Clean up the hash (remove any duplicate # characters)
                const cleanHash = hash.replace(/^#+/, '#');
                
                // Parse the hash parameters
                const params = new URLSearchParams(cleanHash.substring(1));
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                const tokenType = params.get('token_type');
                const expiresIn = params.get('expires_in');
                

                if (accessToken) {
                    // Manually set the session using Supabase's setSession
                    this.supabaseClient.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || null
                    }).then(({ data: { session }, error }) => {
                        if (error) {
                            return;
                        }
                        
                        if (session) {
                            this.currentUserId = session.user.id;
                            this.accessGrantedTime = Date.now();
                            
                            // Clean up URL
                            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
                            
                            // Refresh page to apply new session state
                            window.location.reload();
                        }
                    });
                }
            } catch (error) {
                // Silent error handling
            }
        }
    }
    
    static getCurrentUserId() {
        return this.currentUserId;
    }
    
    static getSessionDuration() {
        return this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;
    }
    
    static async getCurrentSession() {
        try {
            // Always use cross-domain session check
            const mainDomain = window.GATEKEEPER_CONFIG?.MAIN_DOMAIN || 'localhost:3000';
            return await this.getCrossDomainSession(mainDomain);
        } catch (error) {
            return null;
        }
    }
    
    static async getCrossDomainSession(mainDomain) {
        try {
            const protocol = window.location.protocol;
            const sessionUrl = `${protocol}//${mainDomain}/api/session`;
            
            const response = await fetch(sessionUrl, {
                method: 'GET',
                credentials: 'include', // Important for cross-domain cookies
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest', // CSRF protection
                    'X-GateFlow-Origin': window.location.origin, // Origin tracking
                    'X-GateFlow-Version': CONSTANTS.VERSION // Version tracking
                }
            });
            
            if (!response.ok) {
                return null;
            }
            
            const data = await response.json();
            return data.session || null;
        } catch (error) {
            return null;
        }
    }
}

/**
 * Unified access control system
 */
class AccessControl {
    static async batchCheckAccess(productSlugs, userId = null) {
        const results = {};
        
        // Check cache first
        for (const slug of productSlugs) {
            const cacheKey = cache.generateKey('access', slug, 'current');
            const cached = cache.get(cacheKey);
            if (cached !== null) {
                results[slug] = cached;
            }
        }
        
        // Get uncached slugs
        const uncachedSlugs = productSlugs.filter(slug => !(slug in results));
        
        if (uncachedSlugs.length === 0) return results;
        
        try {
            // Check if we're on a different domain than the main domain
            const mainDomain = window.GATEKEEPER_CONFIG?.MAIN_DOMAIN || 'localhost:3000';
            const currentDomain = window.location.host;
            
            // Always use cross-domain API for access checking
            const batchResults = await this.getCrossDomainBatchAccess(mainDomain, uncachedSlugs);
            
            // Cache results
            for (const slug of uncachedSlugs) {
                const hasAccess = batchResults[slug] || false;
                results[slug] = hasAccess;
                cache.set(cache.generateKey('access', slug, 'current'), hasAccess);
            }
            
            Analytics.track(CONSTANTS.EVENTS.BATCH_CHECK, {
                slugs_count: uncachedSlugs.length
            });
            
            return results;
        } catch (error) {
            // Return cached results only, mark uncached as no access
            for (const slug of uncachedSlugs) {
                results[slug] = false;
                cache.set(cache.generateKey('access', slug, 'current'), false, 30000); // Short cache for failed requests
            }
            return results;
        }
    }
    
    static async getCrossDomainAccess(mainDomain, productSlug) {
        try {
            const protocol = window.location.protocol;
            const accessUrl = `${protocol}//${mainDomain}/api/access`;
            
            const response = await fetch(accessUrl, {
                method: 'POST',
                credentials: 'include', // Important for cross-domain cookies
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productSlug })
            });
            
            if (!response.ok) {
                return false;
            }
            
            const data = await response.json();
            return data.hasAccess || false;
        } catch (error) {
            return false;
        }
    }
    
    static async getCrossDomainBatchAccess(mainDomain, productSlugs) {
        try {
            const protocol = window.location.protocol;
            const accessUrl = `${protocol}//${mainDomain}/api/access`;
            
            const response = await fetch(accessUrl, {
                method: 'POST',
                credentials: 'include', // Important for cross-domain cookies
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest', // CSRF protection
                    'X-GateFlow-Origin': window.location.origin, // Origin tracking
                    'X-GateFlow-Version': CONSTANTS.VERSION // Version tracking
                },
                body: JSON.stringify({ productSlugs }) // Send array of slugs
            });
            
            if (!response.ok) {
                return {};
            }
            
            const data = await response.json();
            return data.accessResults || {};
        } catch (error) {
            return {};
        }
    }
}

/**
 * Modern UI template system
 */
class UITemplates {
    static getTheme() {
        return window.gatekeeperConfig?.theme || 'default';
    }
    
    static getThemeColors(theme = 'default') {
        const themes = {
            default: {
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                textColor: '#e0e0e0',
                accentColor: '#00aaff'
            },
            dark: {
                background: 'rgba(0,0,0,0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                textColor: '#ffffff',
                accentColor: '#4facfe'
            },
            light: {
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid rgba(0,0,0,0.1)',
                textColor: '#333333',
                accentColor: '#007bff'
            }
        };
        
        return themes[theme] || themes.default;
    }
    
    static getLoadingTemplate(message = 'Checking access...') {
        const theme = this.getThemeColors(this.getTheme());
        
        return `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="text-align: center; padding: 40px; background: ${theme.background}; border-radius: 16px; border: ${theme.border}; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                <div style="font-size: 48px; margin-bottom: 24px; animation: pulse 2s ease-in-out infinite;">🔐</div>
                <div style="font-size: 20px; color: ${theme.textColor}; margin-bottom: 12px; font-weight: 600;">${message}</div>
                <div style="font-size: 14px; color: ${theme.textColor}; opacity: 0.7; margin-bottom: 24px;">Please wait while we verify your access</div>
                <div style="width: 240px; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; margin: 0 auto; overflow: hidden;">
                    <div style="width: 100%; height: 100%; background: linear-gradient(90deg, ${theme.accentColor}, ${theme.accentColor}dd); border-radius: 3px; animation: loading-bar 2s ease-in-out infinite;"></div>
                </div>
                <div style="margin-top: 20px; font-size: 12px; color: ${theme.textColor}; opacity: 0.5;">
                    Powered by GateFlow v${CONSTANTS.VERSION}
                </div>
            </div>
            <style>
                @keyframes loading-bar {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(0%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                @media (prefers-reduced-motion: reduce) {
                    * { animation: none !important; }
                }
            </style>
        </div>
        `;
    }
    
    static getErrorTemplate(error, productSlug = '') {
        const theme = this.getThemeColors(this.getTheme());
        const config = window.gatekeeperConfig || {};
        const isDev = config.development || window.location.hostname === 'localhost';
        
        return `
        <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 20px;">
            <div style="text-align: center; padding: 40px; background: ${theme.background}; border-radius: 20px; border: ${theme.border}; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 500px; width: 100%;">
                <div style="font-size: 72px; margin-bottom: 24px; animation: shake 0.5s ease-in-out;">⚠️</div>
                <div style="font-size: 24px; color: #ff6b6b; margin-bottom: 16px; font-weight: 600;">Something went wrong</div>
                <div style="font-size: 16px; color: ${theme.textColor}; opacity: 0.8; margin-bottom: 24px; line-height: 1.5;">
                    ${isDev ? error : 'We encountered a temporary issue. Please try again.'}
                </div>
                ${isDev ? `
                <div style="font-size: 12px; color: #666; margin-bottom: 24px; padding: 16px; background: rgba(0,0,0,0.3); border-radius: 8px; font-family: monospace; text-align: left; word-break: break-word;">
                    <strong>Debug Info:</strong><br>${error}
                </div>
                ` : ''}
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 24px;">
                    <button onclick="location.reload()" style="background: #00aaff; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease;">
                        🔄 Try Again
                    </button>
                    ${productSlug ? `
                    <a href="/?product=${productSlug}" style="background: #28a745; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block; transition: all 0.3s ease;">
                        🛒 Product Page
                    </a>
                    ` : ''}
                </div>
                <div style="font-size: 12px; color: ${theme.textColor}; opacity: 0.4;">
                    Error at ${new Date().toLocaleString()} • GateFlow v${CONSTANTS.VERSION}
                </div>
            </div>
            <style>
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            </style>
        </div>
        `;
    }
    
    static getLoginTemplate(productSlug) {
        const theme = this.getThemeColors(this.getTheme());
        
        return `
        <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px;">
            <div style="width: 100%; max-width: 400px; background: ${theme.background}; border-radius: 20px; border: ${theme.border}; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); overflow: hidden;">
                <div style="padding: 40px;">
                    <div id="gatekeeper-message-area" style="margin-bottom: 20px;"></div>
                    
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div style="font-size: 64px; margin-bottom: 16px;">🔐</div>
                        <h2 style="color: ${theme.textColor}; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">Access Required</h2>
                        <p style="color: ${theme.textColor}; opacity: 0.7; margin: 0; font-size: 16px;">Sign in to access this content</p>
                    </div>
                    
                    <form id="gatekeeper-magic-link-form" style="margin-bottom: 24px;">
                        <div style="margin-bottom: 20px;">
                            <label for="gatekeeper-email" style="display: block; color: ${theme.textColor}; font-weight: 500; margin-bottom: 8px; font-size: 14px;">Email address</label>
                            <input type="email" id="gatekeeper-email" placeholder="name@example.com" required 
                                   style="width: 100%; padding: 12px 16px; border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(255,255,255,0.1); color: ${theme.textColor}; font-size: 16px; transition: all 0.3s ease; box-sizing: border-box;">
                        </div>
                        <button type="submit" style="width: 100%; padding: 14px; background: linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}dd); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                            ✨ Send Access Link
                        </button>
                    </form>
                    
                    <div style="text-align: center; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <p style="color: ${theme.textColor}; opacity: 0.6; margin: 0 0 16px 0; font-size: 14px;">
                            Don't have access yet?
                        </p>
                        <a href="/?product=${productSlug}" style="display: inline-block; padding: 10px 20px; background: rgba(255,255,255,0.1); color: ${theme.textColor}; text-decoration: none; border-radius: 6px; font-size: 14px; transition: all 0.3s ease; border: 1px solid rgba(255,255,255,0.2);">
                            🛒 Get Access Now
                        </a>
                    </div>
                    
                    <div style="margin-top: 24px; text-align: center; font-size: 12px; color: ${theme.textColor}; opacity: 0.4;">
                        Secured by GateFlow v${CONSTANTS.VERSION}
                    </div>
                </div>
            </div>
        </div>
        `;
    }
}

/**
 * Enhanced error handling and fallback system
 */
class ErrorHandler {
    static handleError(error, context, productSlug = '') {
        const config = window.gatekeeperConfig || {};
        const fallbackMode = config.fallbackMode || CONSTANTS.FALLBACK_MODES.HIDE_ALL;
        const isDev = config.development || window.location.hostname === 'localhost';
        
        Analytics.track(CONSTANTS.EVENTS.ERROR, {
            error: error.message,
            context,
            product_slug: productSlug,
            fallback_mode: fallbackMode,
            stack: error.stack
        });
        
        if (isDev) {
            document.body.innerHTML = UITemplates.getErrorTemplate(error.message, productSlug);
            return false;
        }
        
        switch (fallbackMode) {
            case CONSTANTS.FALLBACK_MODES.SHOW_ALL:
                return true;
            case CONSTANTS.FALLBACK_MODES.SHOW_FREE:
                this.showFreeContentOnly();
                return false;
            case CONSTANTS.FALLBACK_MODES.HIDE_ALL:
            default:
                this.hideAllContent();
                return false;
        }
    }
    
    static showFreeContentOnly() {
        // Remove protected elements but keep data-no-access content
        document.querySelectorAll('[data-gatekeeper-product]').forEach(el => {
            const noAccessElements = el.querySelectorAll('[data-no-access]');
            
            if (noAccessElements.length > 0) {
                // Keep only the no-access elements
                el.innerHTML = '';
                noAccessElements.forEach(noAccessEl => {
                    noAccessEl.removeAttribute('data-no-access');
                    el.appendChild(noAccessEl);
                });
                el.removeAttribute('data-gatekeeper-product');
            } else {
                // No data-no-access elements found - remove the entire element
                el.remove();
            }
        });
    }
    
    static hideAllContent() {
        // Remove all protected content completely
        document.querySelectorAll('[data-gatekeeper-product]').forEach(el => {
            el.remove();
        });
    }
}

/**
 * Performance monitoring with method decoration
 */
class PerformanceMonitor {
    static measure(label, fn) {
        return async (...args) => {
            const startTime = performance.now();
            try {
                const result = await fn(...args);
                const duration = performance.now() - startTime;
                
                Analytics.track(CONSTANTS.EVENTS.PERFORMANCE, {
                    label,
                    duration,
                    success: true
                });
                
                return result;
            } catch (error) {
                const duration = performance.now() - startTime;
                
                Analytics.track(CONSTANTS.EVENTS.PERFORMANCE, {
                    label,
                    duration,
                    success: false,
                    error: error.message
                });
                
                throw error;
            }
        };
    }
}

// ============================================================================
// MAIN GATEKEEPER CLASS
// ============================================================================

/**
 * Main GateFlow system orchestrator
 */
class GateFlow {
    constructor() {
        this.initialized = false;
        this.config = null;
        this.protectionMode = null;
    }
    
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Show loading state
            document.body.innerHTML = UITemplates.getLoadingTemplate('Initializing GateFlow...');
            
            // Initialize components
            await this.initializeComponents();
            
            // Determine protection mode
            this.protectionMode = this.detectProtectionMode();
            
            // Apply protection based on mode
            await this.applyProtection();
            
            this.initialized = true;
            
            // Mark as initialized globally
            window.GATEKEEPER_INITIALIZED = true;
            
            Analytics.track(CONSTANTS.EVENTS.PERFORMANCE, {
                action: 'initialization_complete',
                mode: this.protectionMode,
                duration: performance.now()
            });
            
        } catch (error) {
            ErrorHandler.handleError(error, 'initialization');
        }
    }
    
    async initializeComponents() {
        // Load configuration
        this.config = window.gatekeeperConfig || {};
        
        // Load Supabase
        await this.loadSupabase();
        
        // Initialize license system
        await LicenseManager.checkLicense();
        
        // Create watermark if needed
        LicenseManager.createWatermark();
        
        // Initialize session management
        SessionManager.initialize(SessionManager.supabaseClient);
        
    }
    
    async loadSupabase() {
        if (window.supabase) {
            this.createSupabaseClient();
            return;
        }
        
        try {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                script.onload = () => {
                    this.createSupabaseClient();
                    resolve();
                };
                script.onerror = () => {
                    // Create mock client for development
                    SessionManager.supabaseClient = {
                        auth: {
                            getSession: () => Promise.resolve({ data: { session: null } }),
                            onAuthStateChange: () => ({ data: { subscription: null } }),
                            signInWithOtp: () => Promise.resolve({ error: null })
                        },
                        rpc: () => Promise.resolve({ data: false, error: null })
                    };
                    resolve();
                };
                document.head.appendChild(script);
            });
        } catch (error) {
            // Fallback to mock client
            SessionManager.supabaseClient = {
                auth: {
                    getSession: () => Promise.resolve({ data: { session: null } }),
                    onAuthStateChange: () => ({ data: { subscription: null } }),
                    signInWithOtp: () => Promise.resolve({ error: null })
                },
                rpc: () => Promise.resolve({ data: false, error: null })
            };
        }
    }
    
    createSupabaseClient() {
        // Try to get config from injected GATEKEEPER_CONFIG or fallback to window.gatekeeperConfig
        const injectedConfig = typeof GATEKEEPER_CONFIG !== 'undefined' ? GATEKEEPER_CONFIG : {};
        const windowConfig = window.gatekeeperConfig || {};
        const config = { ...windowConfig, ...injectedConfig };
        
        // Check for Supabase configuration in multiple possible locations
        const supabaseUrl = config.SUPABASE_URL || 
                           config.supabaseUrl || 
                           process?.env?.NEXT_PUBLIC_SUPABASE_URL ||
                           'https://your-project.supabase.co';
        
        const supabaseAnonKey = config.SUPABASE_ANON_KEY || 
                               config.supabaseAnonKey || 
                               process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                               'your-anon-key';
        
        if (!supabaseUrl || !supabaseAnonKey || 
            supabaseUrl === 'https://your-project.supabase.co' || 
            supabaseAnonKey === 'your-anon-key') {
            // Create a mock client for development
            SessionManager.supabaseClient = {
                auth: {
                    getSession: () => Promise.resolve({ data: { session: null } }),
                    onAuthStateChange: () => ({ data: { subscription: null } }),
                    signInWithOtp: () => Promise.resolve({ error: null })
                },
                rpc: () => Promise.resolve({ data: false, error: null })
            };
            return;
        }
        
        SessionManager.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    }
    
    detectProtectionMode() {
        const params = new URLSearchParams(window.location.search);
        
        // Check for productSlug parameter in script URL or configuration
        const currentScript = document.currentScript;
        let scriptProductSlug = null;
        
        // First check GATEKEEPER_CONFIG for productSlug
        if (window.GATEKEEPER_CONFIG && window.GATEKEEPER_CONFIG.PRODUCT_SLUG) {
            scriptProductSlug = window.GATEKEEPER_CONFIG.PRODUCT_SLUG;
        }
        
        // Then check script URL parameters
        if (!scriptProductSlug && currentScript) {
            try {
                const scriptUrl = new URL(currentScript.src);
                scriptProductSlug = scriptUrl.searchParams.get('productSlug');
            } catch (error) {
                // If URL parsing fails, continue without script parameter
            }
        }
        
        // Check original content if available, otherwise current DOM
        const originalContent = document.body.getAttribute('data-original-content');
        let searchContent = document.body;
        
        if (originalContent) {
            // Create temporary container to search in original content
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = originalContent;
            searchContent = tempContainer;
        }
        
        const protectedElements = searchContent.querySelectorAll('[data-gatekeeper-product]');
        
        // Always use element protection if protected elements exist
        if (protectedElements.length > 0) {
            // Store product slug for page-level redirect check
            if (scriptProductSlug) {
                this.fullPageProductSlug = scriptProductSlug;
            } else if (params.has('product')) {
                this.fullPageProductSlug = params.get('product');
            }
            
            return 'element';
        }
        
        // Only use page protection if no elements but have productSlug
        if (scriptProductSlug) {
            this.fullPageProductSlug = scriptProductSlug;
            return 'page';
        } else if (params.has('product')) {
            return 'page';
        }
        
        return 'none';
    }
    
    async applyProtection() {
        // Check for multiple protection modes
        const originalContent = document.body.getAttribute('data-original-content');
        let searchContent = document.body;
        
        if (originalContent) {
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = originalContent;
            searchContent = tempContainer;
        }
        
        const protectedElements = searchContent.querySelectorAll('[data-gatekeeper-product]');
        
        switch (this.protectionMode) {
            case 'page':
                await this.protectPage();
                break;
            case 'element':
                // For element mode, first check if we need page-level redirect
                if (this.fullPageProductSlug) {
                    const pageAccessGranted = await this.checkPageAccess();
                    if (!pageAccessGranted) {
                        // Page access denied - redirect instead of processing elements
                        return;
                    }
                }
                // Always process elements if we reach here
                await this.protectElements();
                break;
            default:
                // No protection needed, restore original content
                this.restoreOriginalContent();
                break;
        }
    }
    
    async protectPage() {
        const params = new URLSearchParams(window.location.search);
        let productSlug = params.get('product');
        
        // Use script parameter if available (higher priority)
        if (this.fullPageProductSlug) {
            productSlug = this.fullPageProductSlug;
        }
        
        if (!productSlug) {
            ErrorHandler.handleError(new Error('No product slug provided'), 'page_protection');
            return;
        }
        
        // Check if user has current session
        const session = await SessionManager.getCurrentSession();
        
        if (session?.user) {
            // Check access using batch method
            const accessResults = await AccessControl.batchCheckAccess([productSlug], session.user.id);
            const hasAccess = accessResults[productSlug] || false;
            
            if (hasAccess) {
                this.restoreOriginalContent();
                // Show page content
                document.body.style.visibility = 'visible';
                document.body.classList.add('gatekeeper-ready');
                
                Analytics.track(CONSTANTS.EVENTS.ACCESS_GRANTED, {
                    product_slug: productSlug,
                    user_id: session.user.id
                });
                return;
            }
        }
        
        Analytics.track(CONSTANTS.EVENTS.ACCESS_DENIED, {
            product_slug: productSlug,
            user_id: session?.user?.id || 'anonymous',
            redirect_to: `/p/${productSlug}`
        });
        
        // Build redirect URL with return_url parameter
        const returnUrl = encodeURIComponent(window.location.href);
        const mainDomain = window.GATEKEEPER_CONFIG?.MAIN_DOMAIN || 'localhost:3000';
        const protocol = window.location.protocol;
        
        // Always redirect to main domain for authentication
        window.location.href = `${protocol}//${mainDomain}/p/${productSlug}?return_url=${returnUrl}`;
    }
    
    async protectElements() {
        // First restore original content to work with
        this.restoreOriginalContent();
        
        const protectedElements = document.querySelectorAll('[data-gatekeeper-product]');
        
        if (protectedElements.length === 0) {
            return;
        }
        
        // Get unique product slugs
        const productSlugs = [...new Set(
            Array.from(protectedElements).map(el => el.dataset.gatekeeperProduct)
        )];
        
        // Get current user
        const session = await SessionManager.getCurrentSession();
        const userId = session?.user?.id || null;
        
        // Batch check access
        const accessResults = await AccessControl.batchCheckAccess(productSlugs, userId);
        
        // Process each element
        protectedElements.forEach(element => {
            const productSlug = element.dataset.gatekeeperProduct;
            const hasAccess = accessResults[productSlug] || false;
            
            if (hasAccess) {
                // User has access - remove any data-no-access elements inside
                element.querySelectorAll('[data-no-access]').forEach(noAccessEl => {
                    noAccessEl.remove();
                });
                
                // Remove the data-gatekeeper-product attribute but keep the element
                element.removeAttribute('data-gatekeeper-product');
                
                Analytics.track(CONSTANTS.EVENTS.ELEMENT_ACCESSED, {
                    product_slug: productSlug,
                    element_tag: element.tagName.toLowerCase()
                });
            } else {
                // User doesn't have access - keep only data-no-access elements
                const noAccessElements = element.querySelectorAll('[data-no-access]');
                const elementContent = element.innerHTML;
                
                if (noAccessElements.length > 0) {
                    // Keep only the no-access elements
                    element.innerHTML = '';
                    noAccessElements.forEach(noAccessEl => {
                        // Remove the data-no-access attribute and add content to main element
                        noAccessEl.removeAttribute('data-no-access');
                        element.appendChild(noAccessEl);
                    });
                } else {
                    // No data-no-access elements found - remove the entire element
                    element.remove();
                }
                
                // Remove the data-gatekeeper-product attribute
                element.removeAttribute('data-gatekeeper-product');
                
                Analytics.track(CONSTANTS.EVENTS.ELEMENT_PROTECTED, {
                    product_slug: productSlug,
                    element_tag: element.tagName.toLowerCase()
                });
            }
        });
    }
    
    async checkPageAccess() {
        if (!this.fullPageProductSlug) {
            return true; // No page-level product specified
        }
        
        // Check if user has current session
        const session = await SessionManager.getCurrentSession();
        
        if (session?.user) {
            // Check access using batch method
            const accessResults = await AccessControl.batchCheckAccess([this.fullPageProductSlug], session.user.id);
            const hasAccess = accessResults[this.fullPageProductSlug] || false;
            
            if (hasAccess) {
                Analytics.track(CONSTANTS.EVENTS.ACCESS_GRANTED, {
                    product_slug: this.fullPageProductSlug,
                    user_id: session.user.id,
                    context: 'page_access_check'
                });
                return true; // ✅ User has access to page-level product
            }
        }
        
        Analytics.track(CONSTANTS.EVENTS.ACCESS_DENIED, {
            product_slug: this.fullPageProductSlug,
            user_id: session?.user?.id || 'anonymous',
            redirect_to: `/p/${this.fullPageProductSlug}`,
            context: 'page_access_check'
        });
        
        // Build redirect URL with return_url parameter
        const returnUrl = encodeURIComponent(window.location.href);
        const mainDomain = window.GATEKEEPER_CONFIG?.MAIN_DOMAIN || 'localhost:3000';
        const protocol = window.location.protocol;
        
        // Always redirect to main domain for authentication
        window.location.href = `${protocol}//${mainDomain}/p/${this.fullPageProductSlug}?return_url=${returnUrl}`;
        
        return false;
    }
    
    restoreOriginalContent() {
        // Remove any loading states and show original content
        const originalContent = document.body.getAttribute('data-original-content');
        if (originalContent) {
            document.body.innerHTML = originalContent;
            document.body.removeAttribute('data-original-content');
        }
        
        // Also remove any loading classes or styles
        document.body.classList.remove('gateflow-loading');
        document.body.style.overflow = '';
        
    }
    
    // Public API methods
    static async checkProductAccess(productSlug) {
        const results = await AccessControl.batchCheckAccess([productSlug]);
        return results[productSlug] || false;
    }
    
    static getCurrentUser() {
        return SessionManager.getCurrentUserId();
    }
    
    static trackEvent(eventName, data = {}) {
        Analytics.track(eventName, data);
    }
    
    // Instance methods for convenience
    async checkProductAccess(productSlug, userId = null) {
        const results = await AccessControl.batchCheckAccess([productSlug], userId);
        return results[productSlug] || false;
    }
    
    getCurrentUser() {
        return SessionManager.getCurrentUserId();
    }
    
    trackEvent(eventName, data = {}) {
        Analytics.track(eventName, data);
    }
    
    get supabaseClient() {
        return SessionManager.supabaseClient;
    }
}

// ============================================================================
// GLOBAL INITIALIZATION
// ============================================================================

// Global instances
const cache = new CacheManager();
const gateflow = new GateFlow();

// Store original content before any modifications
if (document.body && !document.body.getAttribute('data-original-content')) {
    document.body.setAttribute('data-original-content', document.body.innerHTML);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        gateflow.initialize().catch(error => {
            // Fallback to showing original content
            const originalContent = document.body.getAttribute('data-original-content');
            if (originalContent) {
                document.body.innerHTML = originalContent;
                document.body.removeAttribute('data-original-content');
            }
        });
    });
} else {
    gateflow.initialize().catch(error => {
        // Fallback to showing original content
        const originalContent = document.body.getAttribute('data-original-content');
        if (originalContent) {
            document.body.innerHTML = originalContent;
            document.body.removeAttribute('data-original-content');
        }
    });
}

// Expose public API
window.GateFlow = GateFlow;
window.gateflow = gateflow;
window.cache = cache;

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cache.destroy();
});

// Enhanced error handling for uncaught errors
window.addEventListener('error', (event) => {
    if (event.error?.stack?.includes('gateflow') || event.error?.stack?.includes('gatekeeper')) {
        Analytics.track(CONSTANTS.EVENTS.ERROR, {
            error: event.error.message,
            context: 'global_error_handler',
            stack: event.error.stack
        });
    }
});

// Performance monitoring
window.addEventListener('load', () => {
    Analytics.track(CONSTANTS.EVENTS.PERFORMANCE, {
        action: 'page_load_complete',
        load_time: performance.now(),
        memory_usage: performance.memory ? performance.memory.usedJSHeapSize : null
    });
});

// Export classes to window for debugging and external access
window.SessionManager = SessionManager;
window.AccessControl = AccessControl;
window.CacheManager = CacheManager;
window.Analytics = Analytics;
window.ErrorHandler = ErrorHandler;
window.UITemplates = UITemplates;
window.GateFlow = GateFlow;

