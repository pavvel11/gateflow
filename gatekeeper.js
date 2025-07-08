// gatekeeper.js (v8 - Enterprise Content Protection System)
// GateFlow - Professional Content Access Control
// 
// 🏢 ENTERPRISE FEATURES:
// • Domain-based licensing with anti-tampering protection
// • Advanced analytics with custom dimensions & device tracking  
// • Batch operations with intelligent caching (5min TTL)
// • Multi-theme UI support with accessibility features
// • Error handling with configurable fallback modes
// • Performance monitoring with retry logic & timeouts
//
// 🔐 SECURITY FEATURES:
// • Protected elements REMOVED from DOM (not just hidden)
// • License verification via multiple redundant endpoints
// • Domain fingerprinting with browser environment detection
// • Auto-restoring watermark with MutationObserver protection
// • Obfuscated license keys and domain validation
//
// 💡 USAGE MODES:
// • Page Protection: Entire page access control
// • Element Protection: Selective content via data-gatekeeper-product  
// • Toggle Mode: Free/paid content switching via data-free/data-paid
//
// 📄 LICENSE: Freemium model - Free with watermark, $49/domain/year for removal
// 🌐 Website: https://gateflow.pl | 📧 Support: support@gateflow.pl

// Configuration
const SUPABASE_URL = 'https://grinnleqqyygznnbpjzc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyaW5ubGVxcXl5Z3pubmJwanpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MDI4MzksImV4cCI6MjA2NzQ3ODgzOX0.1iHxyjc3KKTz9uNin_wmpM7t0yKRC3DD_9jLl4stNiQ';

// Constants
const DUPLICATE_KEY_ERROR = '23505';
const QUERY_TIMEOUT_MS = 3000;
const PROCESSING_DELAY_MS = 100;
const CACHE_EXPIRY_MS = 300000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;

// GateFlow Licensing System
const GATEFLOW_VERSION = '1.0.0';
const GATEFLOW_LICENSE_CHECK_INTERVAL = 86400000; // 24 hours
const GATEFLOW_LICENSE_ENDPOINTS = [
    'https://api.gateflow.pl/license/verify',
    'https://license.gateflow.pl/v1/check',
    'https://gateflow-licensing.vercel.app/api/verify'
];

// Cache for performance optimization
const gatekeeperCache = new Map();
const gateflowLicenseCache = new Map();

// User session tracking
let currentUserId = null;
let sessionStartTime = null;
let accessGrantedTime = null;
let licenseStatus = { valid: false, domain: null, expires: null };

// Analytics & Event Tracking
const GATEKEEPER_EVENTS = {
    ACCESS_GRANTED: 'gateflow_access_granted',
    ACCESS_DENIED: 'gateflow_access_denied',
    LOGIN_FORM_SHOWN: 'gateflow_login_form_shown',
    MAGIC_LINK_SENT: 'gateflow_magic_link_sent',
    FREE_PRODUCT_GRANTED: 'gateflow_free_product_granted',
    ELEMENT_REMOVED: 'gateflow_element_removed_security',
    BATCH_CHECK_PERFORMED: 'gateflow_batch_check_performed',
    ERROR_OCCURRED: 'gateflow_error_occurred',
    PAGE_LOAD_TIME: 'gateflow_page_load_time',
    USER_PROGRESS: 'gateflow_user_progress',
    CACHE_HIT: 'gateflow_cache_hit',
    PERFORMANCE_METRIC: 'gateflow_performance_metric',
    LICENSE_CHECK: 'gateflow_license_check',
    LICENSE_VIOLATION: 'gateflow_license_violation'
};

/**
 * GateFlow License System
 * Provides domain-based licensing with anti-tampering measures
 */
function obfuscateString(str) {
    return btoa(str).split('').reverse().join('');
}

function deobfuscateString(str) {
    return atob(str.split('').reverse().join(''));
}

function getDomainFingerprint() {
    const domain = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Create domain fingerprint
    const fingerprint = `${protocol}//${domain}${port ? ':' + port : ''}`;
    
    // Add some browser fingerprinting for extra security
    const userAgent = navigator.userAgent;
    const language = navigator.language;
    
    // Use userAgentData if available (modern browsers), fallback to userAgent parsing
    let platformInfo = 'unknown';
    try {
        if (navigator.userAgentData && navigator.userAgentData.platform) {
            platformInfo = navigator.userAgentData.platform;
        } else {
            // Fallback: extract platform info from userAgent without using deprecated navigator.platform
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes('win')) platformInfo = 'windows';
            else if (ua.includes('mac')) platformInfo = 'macos';
            else if (ua.includes('linux')) platformInfo = 'linux';
            else if (ua.includes('android')) platformInfo = 'android';
            else if (ua.includes('iphone') || ua.includes('ipad')) platformInfo = 'ios';
            else platformInfo = 'other';
        }
    } catch (e) {
        platformInfo = 'unknown';
    }
    
    const combined = `${fingerprint}|${userAgent.slice(0, 50)}|${language}|${platformInfo}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
}

async function checkGateFlowLicense() {
    const config = window.gatekeeperConfig || {};
    const licenseKey = config.gateflowLicense;
    
    // If no license key provided, show watermark
    if (!licenseKey) {
        licenseStatus.valid = false;
        licenseStatus.showWatermark = true;
        return false;
    }
    
    // Check cache first
    const cacheKey = `license_${getDomainFingerprint()}`;
    const cached = gateflowLicenseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < GATEFLOW_LICENSE_CHECK_INTERVAL) {
        licenseStatus = cached.data;
        return cached.data.valid;
    }
    
    const domainFingerprint = getDomainFingerprint();
    const currentDomain = window.location.hostname;
    
    try {
        // Try multiple endpoints for redundancy
        for (const endpoint of GATEFLOW_LICENSE_ENDPOINTS) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-GateFlow-Version': GATEFLOW_VERSION
                    },
                    body: JSON.stringify({
                        license: obfuscateString(licenseKey),
                        domain: obfuscateString(currentDomain),
                        fingerprint: domainFingerprint,
                        timestamp: Date.now(),
                        version: GATEFLOW_VERSION
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    
                    if (result.valid) {
                        licenseStatus = {
                            valid: true,
                            domain: currentDomain,
                            expires: result.expires,
                            showWatermark: false,
                            plan: result.plan || 'pro'
                        };
                        
                        // Cache the result
                        gateflowLicenseCache.set(cacheKey, {
                            data: licenseStatus,
                            timestamp: Date.now()
                        });
                        
                        trackEvent(GATEKEEPER_EVENTS.LICENSE_CHECK, {
                            status: 'valid',
                            domain: currentDomain,
                            plan: result.plan
                        });
                        
                        return true;
                    }
                }
            } catch (error) {
                console.log('GateFlow: License endpoint unavailable:', error.message);
            }
        }
        
        // If all endpoints fail or license invalid
        licenseStatus = {
            valid: false,
            domain: currentDomain,
            showWatermark: true,
            violation: 'invalid_license'
        };
        
        trackEvent(GATEKEEPER_EVENTS.LICENSE_VIOLATION, {
            domain: currentDomain,
            license_key: licenseKey ? 'provided' : 'missing',
            fingerprint: domainFingerprint
        });
        
        return false;
        
    } catch (error) {
        console.log('GateFlow: License check failed:', error.message);
        
        // On error, allow operation but show watermark
        licenseStatus = {
            valid: false,
            domain: currentDomain,
            showWatermark: true,
            violation: 'check_failed'
        };
        
        return false;
    }
}

function createGateFlowWatermark() {
    if (licenseStatus.valid) return;
    
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
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="window.open('https://gateflow.pl/pricing', '_blank')">
            <span style="margin-right: 8px;">🔐</span>
            Secured by <strong>GateFlow</strong> v${GATEFLOW_VERSION}
            <div style="font-size: 10px; opacity: 0.8; margin-top: 2px;">
                Get license to remove this notice
            </div>
        </div>
    `;
    
    document.body.appendChild(watermark);
    
    // Add some anti-tampering
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.removedNodes.forEach((node) => {
                    if (node.id === 'gateflow-watermark') {
                        // Re-create watermark if removed
                        setTimeout(createGateFlowWatermark, 1000);
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Periodic check to ensure watermark exists
    setInterval(() => {
        if (!document.getElementById('gateflow-watermark') && !licenseStatus.valid) {
            createGateFlowWatermark();
        }
    }, 5000);
}

/**
 * Advanced cache management
 */
function getCacheKey(type, ...args) {
    return `${type}_${args.join('_')}`;
}

function getCachedData(key) {
    const cached = gatekeeperCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > CACHE_EXPIRY_MS) {
        gatekeeperCache.delete(key);
        return null;
    }
    
    trackEvent(GATEKEEPER_EVENTS.CACHE_HIT, { key });
    return cached.data;
}

function setCachedData(key, data) {
    gatekeeperCache.set(key, {
        data,
        timestamp: Date.now()
    });
}

/**
 * Performance monitoring
 */
function measurePerformance(label, fn) {
    return async (...args) => {
        const startTime = performance.now();
        try {
            const result = await fn(...args);
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            trackEvent(GATEKEEPER_EVENTS.PERFORMANCE_METRIC, {
                label,
                duration,
                success: true
            });
            
            return result;
        } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            trackEvent(GATEKEEPER_EVENTS.PERFORMANCE_METRIC, {
                label,
                duration,
                success: false,
                error: error.message
            });
            
            throw error;
        }
    };
}

/**
 * Enhanced analytics tracking with advanced features
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
function trackEvent(event, data = {}) {
    try {
        const config = window.gatekeeperConfig || {};
        const advancedConfig = window.gatekeeperAdvancedConfig || {};
        
        // Add comprehensive event data
        const eventData = {
            ...data,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            gateflow_version: GATEFLOW_VERSION,
            license_status: licenseStatus.valid ? 'licensed' : 'unlicensed',
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            user_id: currentUserId,
            session_duration: sessionStartTime ? Date.now() - sessionStartTime : 0,
            time_to_access: accessGrantedTime ? Date.now() - accessGrantedTime : 0
        };
        
        // Add custom dimensions if configured
        if (advancedConfig.analytics?.customDimensions) {
            Object.assign(eventData, advancedConfig.analytics.customDimensions);
        }
        
        // Add device information if enabled
        if (advancedConfig.analytics?.trackDeviceInfo) {
            // Use modern userAgentData when available, fallback to parsing userAgent
            let platformInfo = 'unknown';
            if (navigator.userAgentData && navigator.userAgentData.platform) {
                platformInfo = navigator.userAgentData.platform;
            } else {
                // Fallback: parse platform from userAgent string
                const ua = navigator.userAgent.toLowerCase();
                if (ua.includes('win')) platformInfo = 'Windows';
                else if (ua.includes('mac')) platformInfo = 'macOS';
                else if (ua.includes('linux')) platformInfo = 'Linux';
                else if (ua.includes('android')) platformInfo = 'Android';
                else if (ua.includes('iphone') || ua.includes('ipad')) platformInfo = 'iOS';
            }
            
            eventData.device_info = {
                platform: platformInfo,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            };
        }
        
        console.log(`📊 GateFlow Analytics: ${event}`, eventData);
        
        // Send to multiple analytics providers if available
        if (window.gtag) {
            window.gtag('event', event, eventData);
        }
        
        if (window.analytics) {
            window.analytics.track(event, eventData);
        }
        
        if (window.fbq) {
            window.fbq('trackCustom', event, eventData);
        }
        
        // Custom analytics endpoint if configured
        if (config.analyticsEndpoint) {
            fetch(config.analyticsEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event, data: eventData })
            }).catch(err => console.log('Analytics endpoint failed:', err));
        }
        
    } catch (error) {
        console.log('Analytics tracking failed:', error);
    }
}

// Templates

// Enhanced Templates with Theme Support

const LOADING_THEMES = {
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

function getLoadingHTML(message = 'Checking access...', theme = 'default') {
    const t = LOADING_THEMES[theme] || LOADING_THEMES.default;
    
    return `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <div style="text-align: center; padding: 40px; background: ${t.background}; border-radius: 16px; border: ${t.border}; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
            <div style="font-size: 48px; margin-bottom: 24px; animation: pulse 2s ease-in-out infinite;">�</div>
            <div style="font-size: 20px; color: ${t.textColor}; margin-bottom: 12px; font-weight: 600;">${message}</div>
            <div style="font-size: 14px; color: ${t.textColor}; opacity: 0.7; margin-bottom: 24px;">Please wait a moment while we verify your access</div>
            <div style="width: 240px; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; margin: 0 auto; overflow: hidden;">
                <div style="width: 100%; height: 100%; background: linear-gradient(90deg, ${t.accentColor}, ${t.accentColor}dd); border-radius: 3px; animation: loading-bar 2s ease-in-out infinite;"></div>
            </div>
            <div style="margin-top: 20px; font-size: 12px; color: ${t.textColor}; opacity: 0.5;">
                Powered by GateFlow v${GATEFLOW_VERSION}
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

function getErrorHTML(error, productSlug = '', theme = 'default') {
    const t = LOADING_THEMES[theme] || LOADING_THEMES.default;
    const config = window.gatekeeperConfig || {};
    const isDevelopment = config.development || window.location.hostname === 'localhost';
    
    const errorMessage = isDevelopment ? error : 'We encountered a temporary issue while checking your access.';
    
    return `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 20px;">
        <div style="text-align: center; padding: 40px; background: ${t.background}; border-radius: 20px; border: ${t.border}; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 500px; width: 100%;">
            <div style="font-size: 72px; margin-bottom: 24px; animation: shake 0.5s ease-in-out;">⚠️</div>
            <div style="font-size: 24px; color: #ff6b6b; margin-bottom: 16px; font-weight: 600;">Oops! Something went wrong</div>
            <div style="font-size: 16px; color: ${t.textColor}; opacity: 0.8; margin-bottom: 24px; line-height: 1.5;">
                ${errorMessage}
            </div>
            ${isDevelopment ? `
            <div style="font-size: 12px; color: #666; margin-bottom: 24px; padding: 16px; background: rgba(0,0,0,0.3); border-radius: 8px; font-family: 'Monaco', 'Consolas', monospace; text-align: left; word-break: break-word;">
                <strong>Debug Info:</strong><br>
                ${error}
            </div>
            ` : ''}
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 24px;">
                <button onclick="location.reload()" 
                        style="background: #00aaff; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"
                        onmouseover="this.style.transform='translateY(-2px)'"
                        onmouseout="this.style.transform='translateY(0)'">
                    🔄 Try Again
                </button>
                ${productSlug ? `
                <a href="/?product=${productSlug}" 
                   style="background: #28a745; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"
                   onmouseover="this.style.transform='translateY(-2px)'"
                   onmouseout="this.style.transform='translateY(0)'">
                    🛒 Product Page
                </a>
                ` : ''}
                <a href="/" 
                   style="background: #6c757d; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"
                   onmouseover="this.style.transform='translateY(-2px)'"
                   onmouseout="this.style.transform='translateY(0)'">
                    🏠 Home
                </a>
            </div>
            <div style="font-size: 12px; color: ${t.textColor}; opacity: 0.4;">
                Error occurred at ${new Date().toLocaleString()} • GateFlow v${GATEFLOW_VERSION}
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

// Error Handling & Fallback Modes
const FALLBACK_MODE = {
    SHOW_ALL: 'show_all',      // Development mode - show everything
    HIDE_ALL: 'hide_all',      // Production safe - hide everything on error
    SHOW_FREE: 'show_free'     // Show only free content
};

/**
 * Handles errors gracefully with fallback behavior
 * @param {Error} error - The error that occurred
 * @param {string} context - Context where error occurred
 * @param {string} productSlug - Product slug for recovery options
 * @returns {boolean} Whether to continue execution
 */
function handleError(error, context, productSlug = '') {
    const config = window.gatekeeperConfig || {};
    const fallbackMode = config.fallbackMode || FALLBACK_MODE.HIDE_ALL;
    const isDevelopment = config.development || window.location.hostname === 'localhost';
    
    console.error(`Gatekeeper Error in ${context}:`, error);
    
    trackEvent(GATEKEEPER_EVENTS.ERROR_OCCURRED, {
        error: error.message,
        context,
        productSlug,
        fallbackMode,
        stack: error.stack
    });
    
    // In development, show detailed error
    if (isDevelopment) {
        document.body.innerHTML = ERROR_HTML(error.message, productSlug);
        return false;
    }
    
    // In production, handle based on fallback mode
    switch (fallbackMode) {
        case FALLBACK_MODE.SHOW_ALL:
            console.log('Gatekeeper: Fallback mode SHOW_ALL - showing all content');
            document.body.classList.add('gatekeeper-ready');
            return true;
            
        case FALLBACK_MODE.SHOW_FREE:
            console.log('Gatekeeper: Fallback mode SHOW_FREE - removing paid content only');
            document.querySelectorAll('[data-paid], [data-gatekeeper-product]').forEach(el => el.remove());
            document.body.classList.add('gatekeeper-ready');
            return true;
            
        case FALLBACK_MODE.HIDE_ALL:
        default:
            console.log('Gatekeeper: Fallback mode HIDE_ALL - showing error page');
            document.body.innerHTML = ERROR_HTML('Service temporarily unavailable', productSlug);
            return false;
    }
}

/**
 * Shows loading state while processing
 */
function showLoadingState() {
    document.body.innerHTML = LOADING_HTML;
    trackEvent('gatekeeper_loading_shown', { 
        timestamp: Date.now() 
    });
}

function getLoginFormHTML(productSlug, theme = 'default') {
    const t = LOADING_THEMES[theme] || LOADING_THEMES.default;
    
    return `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px;">
        <div class="gatekeeper-form-container" style="width: 100%; max-width: 400px; background: ${t.background}; border-radius: 20px; border: ${t.border}; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); overflow: hidden;">
            <div style="padding: 40px;">
                <div id="gatekeeper-message-area" style="margin-bottom: 20px;"></div>
                
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="font-size: 64px; margin-bottom: 16px;">🔐</div>
                    <h2 style="color: ${t.textColor}; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">Access Required</h2>
                    <p style="color: ${t.textColor}; opacity: 0.7; margin: 0; font-size: 16px;">To view this content, please sign in or get access via the product page.</p>
                </div>
                
                <form id="gatekeeper-magic-link-form" style="margin-bottom: 24px;">
                    <div style="margin-bottom: 20px;">
                        <label for="gatekeeper-email" style="display: block; color: ${t.textColor}; font-weight: 500; margin-bottom: 8px; font-size: 14px;">Email address</label>
                        <input type="email" 
                               id="gatekeeper-email" 
                               placeholder="name@example.com" 
                               required 
                               style="width: 100%; padding: 12px 16px; border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(255,255,255,0.1); color: ${t.textColor}; font-size: 16px; transition: all 0.3s ease; box-sizing: border-box;"
                               onfocus="this.style.borderColor='${t.accentColor}'; this.style.background='rgba(255,255,255,0.15)'"
                               onblur="this.style.borderColor='rgba(255,255,255,0.2)'; this.style.background='rgba(255,255,255,0.1)'">
                    </div>
                    <button type="submit" 
                            style="width: 100%; padding: 14px; background: linear-gradient(135deg, ${t.accentColor}, ${t.accentColor}dd); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"
                            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.3)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.2)'">
                        ✨ Send Access Link
                    </button>
                </form>
                
                <div style="text-align: center; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <p style="color: ${t.textColor}; opacity: 0.6; margin: 0 0 16px 0; font-size: 14px;">
                        Don't have access yet?
                    </p>
                    <a href="/?product=${productSlug}" 
                       style="display: inline-block; padding: 10px 20px; background: rgba(255,255,255,0.1); color: ${t.textColor}; text-decoration: none; border-radius: 6px; font-size: 14px; transition: all 0.3s ease; border: 1px solid rgba(255,255,255,0.2);"
                       onmouseover="this.style.background='rgba(255,255,255,0.2)'"
                       onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                        🛒 Get Access Now
                    </a>
                </div>
                
                <div style="margin-top: 24px; text-align: center; font-size: 12px; color: ${t.textColor}; opacity: 0.4;">
                    Secured by GateFlow v${GATEFLOW_VERSION}
                </div>
            </div>
        </div>
    </div>
    `;
}

function loadSupabaseScript(callback) {
    if (window.supabase) return callback();
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = callback;
    script.onerror = () => console.error("Failed to load Supabase JS library.");
    document.head.appendChild(script);
}

function initializeGatekeeper() {
    console.log("🚀 GateFlow v" + GATEFLOW_VERSION + " - Enterprise Content Protection System");
    console.log("📄 License: Free with watermark | Pro: $49/domain/year");
    console.log("🌐 Website: https://gateflow.pl | 📧 Support: support@gateflow.pl");
    
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.gateflowSupabaseClient = supabase;

    const config = window.gatekeeperConfig || {};
    console.log("GateFlow: Config loaded:", Object.keys(config).length, "options");
    
    const bodyElement = document.body;
    const originalBodyHTML = bodyElement.innerHTML;
    let isProcessing = false; // Flag to prevent multiple simultaneous processing

    /**
     * Enhanced access check with caching and retry logic
     * @param {string} userId - The user ID
     * @param {string} productSlug - The product slug
     * @returns {Promise<boolean>} True if user has access
     */
    const hasAccess = measurePerformance('hasAccess', async (userId, productSlug, retryCount = 0) => {
        if (!userId || !productSlug) {
            console.log("Gatekeeper: Missing userId or productSlug for access check");
            return false;
        }
        
        // Check cache first
        const cacheKey = getCacheKey('access', userId, productSlug);
        const cachedResult = getCachedData(cacheKey);
        if (cachedResult !== null) {
            console.log("Gatekeeper: Cache hit for access check:", cachedResult);
            return cachedResult;
        }
        
        console.log("Gatekeeper: Checking access for:", userId, productSlug);
        
        try {
            const { data, error } = await supabase
                .from('user_product_access')
                .select('id')
                .eq('user_id', userId)
                .eq('product_slug', productSlug)
                .limit(1);
                
            if (error) {
                console.error("Gatekeeper: Error checking product access:", error);
                
                // Retry logic for transient errors
                if (retryCount < MAX_RETRY_ATTEMPTS && error.code !== '23505') {
                    console.log(`Gatekeeper: Retrying access check (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                    return hasAccess(userId, productSlug, retryCount + 1);
                }
                
                return false;
            }
            
            const hasAccess = data && data.length > 0;
            console.log("Gatekeeper: Access check result:", hasAccess);
            
            // Cache the result
            setCachedData(cacheKey, hasAccess);
            
            return hasAccess;
        } catch (error) {
            console.error("Gatekeeper: Access check failed:", error);
            return false;
        }
    });

    /**
     * Checks access to multiple products in a single query (performance optimization)
     * @param {string} userId - The user ID
     * @param {string[]} productSlugs - Array of product slugs to check
     * @returns {Promise<Set<string>>} Set of product slugs user has access to
     */
    async function checkBatchAccess(userId, productSlugs) {
        if (!userId || !productSlugs || productSlugs.length === 0) {
            console.log("Gatekeeper: Missing userId or productSlugs for batch access check");
            return new Set();
        }
        
        console.log("Gatekeeper: Batch checking access for:", userId, productSlugs);
        
        const { data, error } = await supabase
            .from('user_product_access')
            .select('product_slug')
            .eq('user_id', userId)
            .in('product_slug', productSlugs);
            
        if (error) {
            console.error("Gatekeeper: Error in batch access check:", error);
            return new Set();
        }
        
        const accessSet = new Set(data?.map(row => row.product_slug) || []);
        console.log("Gatekeeper: Batch access result:", { 
            requested: productSlugs, 
            granted: Array.from(accessSet) 
        });
        return accessSet;
    }

    /**
     * Inserts an access record for a user and product
     * @param {string} userId - The user ID
     * @param {string} productSlug - The product slug
     * @returns {Promise<boolean>} True if successful
     */
    async function insertAccessRecord(userId, productSlug) {
        console.log("Gatekeeper: Inserting access record for:", userId, productSlug);
        
        const { error } = await supabase
            .from('user_product_access')
            .insert({ user_id: userId, product_slug: productSlug });
            
        if (error && error.code !== DUPLICATE_KEY_ERROR) {
            console.error("Gatekeeper: Error inserting access record:", error);
            return false;
        }
        
        if (error && error.code === DUPLICATE_KEY_ERROR) {
            console.log("Gatekeeper: User already has access (duplicate key)");
        } else {
            console.log("Gatekeeper: Access record inserted successfully");
        }
        
        return true;
    }

    /**
     * Enhanced product check with caching and retry logic
     * @param {string} productSlug - The product slug
     * @returns {Promise<boolean>} True if product is free
     */
    const isProductFree = measurePerformance('isProductFree', async (productSlug, retryCount = 0) => {
        console.log("Gatekeeper: Checking if product is free:", productSlug);
        
        // Check cache first
        const cacheKey = getCacheKey('product_free', productSlug);
        const cachedResult = getCachedData(cacheKey);
        if (cachedResult !== null) {
            console.log("Gatekeeper: Cache hit for product check:", cachedResult);
            return cachedResult;
        }
        
        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT_MS)
            );
            
            const productQuery = supabase
                .from('products')
                .select('price')
                .eq('slug', productSlug)
                .single();
            
            const result = await Promise.race([productQuery, timeoutPromise]);
            
            if (result.error) {
                console.error("Gatekeeper: Error fetching product:", result.error);
                
                // Retry logic for transient errors
                if (retryCount < MAX_RETRY_ATTEMPTS && !result.error.code) {
                    console.log(`Gatekeeper: Retrying product check (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                    return isProductFree(productSlug, retryCount + 1);
                }
                
                return false;
            }
            
            if (!result.data) {
                console.log("Gatekeeper: Product not found:", productSlug);
                setCachedData(cacheKey, false);
                return false;
            }
            
            const isFree = result.data.price === 0;
            console.log("Gatekeeper: Product price check result:", { productSlug, price: result.data.price, isFree });
            
            // Cache the result
            setCachedData(cacheKey, isFree);
            
            return isFree;
            
        } catch (error) {
            console.error("Gatekeeper: Product query failed:", error.message);
            
            // Retry logic for network errors
            if (retryCount < MAX_RETRY_ATTEMPTS) {
                console.log(`Gatekeeper: Retrying product check (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return isProductFree(productSlug, retryCount + 1);
            }
            
            return false;
        }
    });

    /**
     * Enhanced batch access check for better performance
     * @param {string} userId - The user ID
     * @param {Array<string>} productSlugs - Array of product slugs to check
     * @returns {Promise<Object>} Map of productSlug -> hasAccess
     */
    const batchCheckAccess = measurePerformance('batchCheckAccess', async (userId, productSlugs) => {
        if (!userId || !productSlugs || productSlugs.length === 0) {
            console.log("Gatekeeper: Missing userId or productSlugs for batch check");
            return {};
        }
        
        console.log("Gatekeeper: Batch checking access for:", userId, productSlugs);
        
        // Check cache for each product first
        const results = {};
        const uncachedSlugs = [];
        
        for (const slug of productSlugs) {
            const cacheKey = getCacheKey('access', userId, slug);
            const cachedResult = getCachedData(cacheKey);
            if (cachedResult !== null) {
                results[slug] = cachedResult;
            } else {
                uncachedSlugs.push(slug);
            }
        }
        
        if (uncachedSlugs.length === 0) {
            console.log("Gatekeeper: All products found in cache");
            return results;
        }
        
        try {
            const { data, error } = await supabase
                .from('user_product_access')
                .select('product_slug')
                .eq('user_id', userId)
                .in('product_slug', uncachedSlugs);
                
            if (error) {
                console.error("Gatekeeper: Error in batch access check:", error);
                // Return cached results and false for uncached ones
                uncachedSlugs.forEach(slug => {
                    results[slug] = false;
                });
                return results;
            }
            
            const accessibleSlugs = new Set(data.map(row => row.product_slug));
            
            uncachedSlugs.forEach(slug => {
                const hasAccess = accessibleSlugs.has(slug);
                results[slug] = hasAccess;
                
                // Cache the result
                const cacheKey = getCacheKey('access', userId, slug);
                setCachedData(cacheKey, hasAccess);
            });
            
            console.log("Gatekeeper: Batch access check completed:", results);
            
            trackEvent(GATEKEEPER_EVENTS.BATCH_CHECK_PERFORMED, {
                user_id: userId,
                products_checked: productSlugs.length,
                cache_hits: productSlugs.length - uncachedSlugs.length,
                results
            });
            
            return results;
            
        } catch (error) {
            console.error("Gatekeeper: Batch access check failed:", error);
            // Return false for all uncached products
            uncachedSlugs.forEach(slug => {
                results[slug] = false;
            });
            return results;
        }
    });
    async function grantAccessForFreeProduct(userId, productSlug) {
        if (!userId || !productSlug) {
            console.log("Gatekeeper: Missing userId or productSlug for grant access");
            return false;
        }
        
        console.log("Gatekeeper: Attempting to grant access for:", userId, productSlug);
        
        // Always verify product is free first by checking database
        const isFree = await isProductFree(productSlug);
        if (!isFree) {
            console.log("Gatekeeper: Product is not free or not found");
            trackEvent(GATEKEEPER_EVENTS.ACCESS_DENIED, {
                reason: 'product_not_free',
                userId,
                productSlug
            });
            return false;
        }
        
        console.log("Gatekeeper: Product confirmed as free, granting access");
        const result = await insertAccessRecord(userId, productSlug);
        
        if (result) {
            trackEvent(GATEKEEPER_EVENTS.FREE_PRODUCT_GRANTED, {
                userId,
                productSlug,
                method: 'auto_grant'
            });
        }
        
        return result;
    }

    async function handleElementProtection(userId) {
        console.log("Gatekeeper: Running in element mode");
        const elementsToProtect = Array.from(document.querySelectorAll('[data-gatekeeper-product]'));
        
        if (elementsToProtect.length === 0) {
            console.log("Gatekeeper: No elements to protect");
            return;
        }
        
        // Get unique product slugs for batch check
        const productSlugs = [...new Set(elementsToProtect.map(el => el.dataset.gatekeeperProduct))];
        console.log("Gatekeeper: Checking access for products:", productSlugs);
        
        // Batch check access for all products
        const userAccess = await checkBatchAccess(userId, productSlugs);
        
        trackEvent(GATEKEEPER_EVENTS.BATCH_CHECK_PERFORMED, {
            userId,
            productSlugs,
            accessGranted: Array.from(userAccess),
            elementCount: elementsToProtect.length
        });
        
        // Process each element based on batch results
        let removedCount = 0;
        let shownCount = 0;
        
        elementsToProtect.forEach(element => {
            const requiredSlug = element.dataset.gatekeeperProduct;
            const hasAccess = userAccess.has(requiredSlug);
            
            if (hasAccess) {
                // User has access - show the element
                element.style.display = 'block';
                shownCount++;
                console.log("Gatekeeper: Element shown:", { requiredSlug, element: element.tagName });
            } else {
                // User doesn't have access - REMOVE from DOM for security
                console.log("Gatekeeper: Protected element removed from DOM (security):", { requiredSlug, element: element.tagName });
                trackEvent(GATEKEEPER_EVENTS.ELEMENT_REMOVED, {
                    productSlug: requiredSlug,
                    elementTag: element.tagName,
                    elementId: element.id,
                    elementClass: element.className
                });
                element.remove();
                removedCount++;
            }
        });
        
        console.log("Gatekeeper: Element protection completed:", { 
            total: elementsToProtect.length, 
            shown: shownCount, 
            removed: removedCount 
        });
    }

    /**
     * Handles toggle elements based on product access (data-free vs data-paid)
     * @param {Object} session - Current user session
     * @param {string} productSlugFromUrl - Product slug from URL parameter
     */
    /**
     * Auto-refresh functionality - refresh access when user returns to tab
     */
    function setupAutoRefresh() {
        const config = window.gatekeeperAdvancedConfig || {};
        if (!config.features?.enableAutoRefresh) return;
        
        let isHidden = false;
        
        document.addEventListener('visibilitychange', async () => {
            if (document.hidden) {
                isHidden = true;
            } else if (isHidden) {
                isHidden = false;
                console.log("Gatekeeper: Tab became visible, refreshing access");
                
                // Clear cache to force fresh check
                gatekeeperCache.clear();
                
                // Get current session and re-run protection
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    await handleProtection(session);
                }
            }
        });
    }

    /**
     * Progress tracking for user engagement analytics
     */
    function setupProgressTracking() {
        const config = window.gatekeeperAdvancedConfig || {};
        if (!config.features?.enableProgressTracking) return;
        
        let scrollDepth = 0;
        let timeOnPage = 0;
        const startTime = Date.now();
        
        // Track scroll depth
        if (config.analytics?.trackScrollDepth) {
            window.addEventListener('scroll', () => {
                const currentScroll = window.pageYOffset;
                const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                const depth = Math.round((currentScroll / maxScroll) * 100);
                
                if (depth > scrollDepth && depth % 25 === 0) { // Track every 25%
                    scrollDepth = depth;
                    trackEvent(GATEKEEPER_EVENTS.USER_PROGRESS, {
                        type: 'scroll_depth',
                        value: depth,
                        timestamp: Date.now() - startTime
                    });
                }
            });
        }
        
        // Track time on page
        if (config.analytics?.trackTimeOnPage) {
            setInterval(() => {
                timeOnPage += 30; // Track every 30 seconds
                trackEvent(GATEKEEPER_EVENTS.USER_PROGRESS, {
                    type: 'time_on_page',
                    value: timeOnPage,
                    scroll_depth: scrollDepth
                });
            }, 30000);
        }
    }

    /**
     * Enhanced accessibility features
     */
    function enhanceAccessibility() {
        const config = window.gatekeeperAdvancedConfig || {};
        if (!config.accessibility?.enableAriaLabels) return;
        
        // Add ARIA labels to protected elements
        document.querySelectorAll('[data-gatekeeper-product]').forEach(element => {
            if (!element.getAttribute('aria-label')) {
                element.setAttribute('aria-label', 'Protected content - access required');
            }
        });
        
        // Add screen reader text for toggle elements
        if (config.accessibility?.enableScreenReaderText) {
            document.querySelectorAll('[data-free]').forEach(element => {
                if (!element.querySelector('.sr-only')) {
                    const srText = document.createElement('span');
                    srText.className = 'sr-only';
                    srText.textContent = 'Content available for free users';
                    element.prepend(srText);
                }
            });
            
            document.querySelectorAll('[data-paid]').forEach(element => {
                if (!element.querySelector('.sr-only')) {
                    const srText = document.createElement('span');
                    srText.className = 'sr-only';
                    srText.textContent = 'Premium content - subscription required';
                    element.prepend(srText);
                }
            });
        }
        
        // Add CSS for screen reader only text
        if (!document.getElementById('gatekeeper-a11y-styles')) {
            const style = document.createElement('style');
            style.id = 'gatekeeper-a11y-styles';
            style.textContent = `
                .sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border: 0;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Handles toggle elements based on product access (data-free vs data-paid)
     * @param {Object} session - Current user session
     * @param {string} productSlugFromUrl - Product slug from URL parameter
     */
    async function handleToggleElements(session, productSlugFromUrl) {
        const userId = session?.user?.id;
        const requiredSlug = config.productSlug || productSlugFromUrl;
        
        if (!requiredSlug) {
            console.log("Gatekeeper: No product slug for toggle elements, skipping");
            return;
        }

        console.log("Gatekeeper: Handling toggle elements for product:", requiredSlug);
        
        // Check if user has access to the product
        let hasProductAccess = false;
        if (session) {
            // Try to grant access first if user came with URL parameter
            if (productSlugFromUrl && productSlugFromUrl === requiredSlug) {
                console.log("Gatekeeper: User came with URL parameter, trying to grant access for toggle elements");
                const grantResult = await grantAccessForFreeProduct(userId, requiredSlug);
                if (grantResult) {
                    hasProductAccess = true;
                }
            }
            
            // If still no access, check database
            if (!hasProductAccess) {
                hasProductAccess = await hasAccess(userId, requiredSlug);
            }
        }
        
        console.log("Gatekeeper: Toggle elements access result:", { requiredSlug, hasProductAccess, isLoggedIn: !!session });

        // Handle data-free elements (show when user doesn't have access)
        const freeElements = Array.from(document.querySelectorAll('[data-free]'));
        freeElements.forEach(element => {
            const shouldShow = !hasProductAccess;
            element.style.display = shouldShow ? '' : 'none';
            console.log("Gatekeeper: Free element display:", { element: element.tagName, shouldShow });
        });

        // Handle data-paid elements (show when user has access, REMOVE when no access for security)
        const paidElements = Array.from(document.querySelectorAll('[data-paid]'));
        paidElements.forEach(element => {
            if (hasProductAccess) {
                // User has access - show the element
                element.style.display = '';
                console.log("Gatekeeper: Paid element shown:", { element: element.tagName, hasAccess: true });
            } else {
                // User doesn't have access - REMOVE from DOM for security
                console.log("Gatekeeper: Paid element removed from DOM (security):", { element: element.tagName, hasAccess: false });
                element.remove();
            }
        });
    }

    async function checkAndGrantAccess(session, requiredSlug, productSlugFromUrl) {
        const userId = session?.user?.id;
        let accessGranted = false;
        
        // If user came with URL parameter matching required slug, try to grant access first
        if (session && productSlugFromUrl && productSlugFromUrl === requiredSlug) {
            console.log("Gatekeeper: User came with URL parameter, trying to grant access for free product first");
            const grantResult = await grantAccessForFreeProduct(userId, requiredSlug);
            console.log("Gatekeeper: Grant result:", grantResult);
            if (grantResult) {
                accessGranted = true;
                console.log("Gatekeeper: Access granted successfully via URL parameter");
            }
        }
        
        // If still no access, check database
        if (!accessGranted) {
            accessGranted = await hasAccess(userId, requiredSlug);
            console.log("Gatekeeper: Database access check:", { requiredSlug, accessGranted, userId });
        }
        
        return accessGranted;
    }

    function showLoadingState(message) {
        const config = window.gatekeeperAdvancedConfig || {};
        if (!config.ui?.showProgressBar) return;
        
        const theme = config.ui?.theme === 'auto' ? 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') :
            (config.ui?.theme || 'default');
            
        const loadingMessage = message || config.ui?.loadingMessage || 'Checking access...';
        
        bodyElement.innerHTML = getLoadingHTML(loadingMessage, theme);
    }

    function showLoginForm(requiredSlug) {
        console.log("Gatekeeper: Access denied, showing login form");
        
        const config = window.gatekeeperAdvancedConfig || {};
        const theme = config.ui?.theme === 'auto' ? 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') :
            (config.ui?.theme || 'default');
        
        trackEvent(GATEKEEPER_EVENTS.LOGIN_FORM_SHOWN, {
            productSlug: requiredSlug,
            reason: 'access_required',
            theme
        });
        
        bodyElement.innerHTML = getLoginFormHTML(requiredSlug, theme);
        attachFormSubmitListener(requiredSlug);
    }

    function restoreOriginalContent(session) {
        console.log("Gatekeeper: Restoring original content");
        bodyElement.innerHTML = originalBodyHTML;
        // Re-process any protected elements that might be in the original content
        setTimeout(() => {
            isProcessing = false;
            bodyElement.classList.add('gatekeeper-ready');
            console.log("Gatekeeper: Gatekeeper-ready class added after content restoration");
            handleProtection(session);
        }, PROCESSING_DELAY_MS);
    }

    async function handlePageProtection(session, productSlugFromUrl) {
        console.log("Gatekeeper: Running in page mode");
        const requiredSlug = config.productSlug || productSlugFromUrl;
        console.log("Gatekeeper: Required slug:", requiredSlug, "config:", config.productSlug, "url:", productSlugFromUrl);
        
        if (!requiredSlug) {
            console.error("Gatekeeper: No product slug specified for page protection.");
            showLoginForm('');
            return;
        }
        
        const accessGranted = await checkAndGrantAccess(session, requiredSlug, productSlugFromUrl);
        
        if (!accessGranted) {
            showLoginForm(requiredSlug);
        } else {
            console.log("Gatekeeper: Access granted, showing content");
            // Only restore original content if it's not already there
            if (bodyElement.innerHTML !== originalBodyHTML) {
                restoreOriginalContent(session);
                return;
            } else {
                console.log("Gatekeeper: Original content already restored");
            }
        }
    }

    async function handleProtection(session) {
        if (isProcessing) {
            console.log("Gatekeeper: Already processing, skipping");
            return;
        }
        isProcessing = true;
        
        console.log("Gatekeeper: Starting protection check", session?.user?.id);
        
        // Show loading state for better UX
        const config = window.gatekeeperConfig || {};
        if (config.showLoadingState !== false) {
            showLoadingState();
        }
        
        try {
            const userId = session?.user?.id;
            const urlParams = new URLSearchParams(window.location.search);
            const productSlugFromUrl = urlParams.get('product');
            
            console.log("Gatekeeper: URL params:", { productSlugFromUrl, userId });

            // Check what type of elements we have on the page
            const elementsToProtect = Array.from(document.querySelectorAll('[data-gatekeeper-product]'));
            const toggleElements = Array.from(document.querySelectorAll('[data-free], [data-paid]'));
            
            console.log("Gatekeeper: Elements found:", { 
                toProtect: elementsToProtect.length, 
                toggle: toggleElements.length 
            });

            // Restore original content first if we showed loading
            if (config.showLoadingState !== false) {
                bodyElement.innerHTML = originalBodyHTML;
            }

            // Handle toggle elements (data-free/data-paid) first
            if (toggleElements.length > 0) {
                await handleToggleElements(session, productSlugFromUrl);
            }

            // Handle protected elements or page protection
            if (elementsToProtect.length > 0) {
                await handleElementProtection(userId);
            } else if (toggleElements.length === 0) {
                // Only do page protection if there are no toggle elements
                await handlePageProtection(session, productSlugFromUrl);
            } else {
                console.log("Gatekeeper: Page has toggle elements, skipping page protection");
            }
            
            // ALWAYS add gatekeeper-ready class at the end
            bodyElement.classList.add('gatekeeper-ready');
            console.log("Gatekeeper: Protection check completed, gatekeeper-ready class added");
            
            trackEvent(GATEKEEPER_EVENTS.ACCESS_GRANTED, {
                userId,
                productSlugFromUrl,
                elementsProtected: elementsToProtect.length,
                toggleElements: toggleElements.length,
                mode: elementsToProtect.length > 0 ? 'element' : toggleElements.length > 0 ? 'toggle' : 'page'
            });
            
        } catch (error) {
            console.error("Gatekeeper: Error in handleProtection:", error);
            
            // Handle error gracefully
            const productSlug = new URLSearchParams(window.location.search).get('product') || config.productSlug;
            const shouldContinue = handleError(error, 'handleProtection', productSlug);
            
            if (shouldContinue) {
                // Even if there's an error, show the page to avoid blank screen
                bodyElement.classList.add('gatekeeper-ready');
            }
        } finally {
            isProcessing = false;
        }
    }

    function attachFormSubmitListener(productSlug) {
        const magicLinkForm = document.getElementById('gatekeeper-magic-link-form');
        if (!magicLinkForm) return;
        magicLinkForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('gatekeeper-email').value;
            const submitButton = magicLinkForm.querySelector('button[type="submit"]');
            const messageArea = document.getElementById('gatekeeper-message-area');
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';
            
            // Construct redirect URL properly
            const redirectUrl = productSlug ? 
                `${window.location.origin}${window.location.pathname}?product=${productSlug}` :
                window.location.href;
            
            const { error } = await supabase.auth.signInWithOtp({
                email: email,
                options: { emailRedirectTo: redirectUrl }
            });
            if (error) {
                messageArea.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
                trackEvent(GATEKEEPER_EVENTS.ERROR_OCCURRED, {
                    context: 'magic_link_send',
                    error: error.message,
                    email,
                    productSlug
                });
            } else {
                messageArea.innerHTML = '<div class="alert alert-success">Success! Check your email for the access link.</div>';
                magicLinkForm.style.display = 'none';
                trackEvent(GATEKEEPER_EVENTS.MAGIC_LINK_SENT, {
                    email,
                    productSlug,
                    redirectUrl
                });
            }
            submitButton.disabled = false;
            submitButton.textContent = 'Send Access Link';
        });
    }

    // Initialize advanced features
    setupAutoRefresh();
    setupProgressTracking();
    enhanceAccessibility();
     // Initialize GateFlow licensing system
    checkGateFlowLicense().then(() => {
        createGateFlowWatermark();
        
        // Check initial session
        console.log("GateFlow: Checking initial session");
        supabase.auth.getSession().then(async ({ data: { session }, error }) => {
            if (error) {
                console.error("GateFlow: Error getting session:", error);
            }
            console.log("GateFlow: Initial session:", session?.user?.id);
            
            // No need to grant access here - handleProtection will do it
            handleProtection(session);
        });

        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("GateFlow: Auth state changed:", event, session?.user?.id);
            
            // No need to grant access here either - handleProtection will do it
            // Always re-run protection logic on auth state change
            handleProtection(session);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadSupabaseScript(initializeGatekeeper);
});
