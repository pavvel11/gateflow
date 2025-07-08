/**
 * GateFlow Configuration Example
 * Advanced Content Protection System v8.0
 * 
 * Copy this file to 'config.js' and update with your credentials
 */

// === BASIC CONFIGURATION ===
window.gatekeeperConfig = {
    // Your Supabase project credentials
    supabaseUrl: 'https://your-project.supabase.co',
    supabaseAnonKey: 'your-anon-key-here',
    
    // Product slug for this page/content
    productSlug: 'premium-course',
    
    // GateFlow License (purchase at https://gateflow.pl/pricing)
    // Remove watermark and unlock enterprise features
    gateflowLicense: 'GFLOW-XXXX-XXXX-XXXX-XXXX', // Your license key
    
    // Basic settings
    development: false,                    // Enable debug logging
    analyticsEndpoint: null,              // Custom analytics endpoint
    fallbackMode: 'hide_all'              // 'show_all', 'hide_all', 'show_free'
};

// === ADVANCED CONFIGURATION ===
window.gatekeeperAdvancedConfig = {
    
    // === PERFORMANCE SETTINGS ===
    performance: {
        batchSize: 50,                     // Max elements per batch check
        queryTimeout: 5000,                // Database query timeout (ms)
        retryAttempts: 3,                  // Retry failed queries
        cacheExpiry: 300000,               // Cache expiry time (5 minutes)
        enableQueryCache: true,            // Enable intelligent caching
        preloadUserAccess: true,           // Preload user permissions
        enableLazyLoading: false,          // Lazy load protection checks
        performanceMonitoring: true        // Track performance metrics
    },
    
    // === USER INTERFACE ===
    ui: {
        theme: 'auto',                     // 'light', 'dark', 'auto'
        loadingAnimation: 'pulse',         // 'pulse', 'spinner', 'progress'
        loadingMessage: 'Checking access...', // Custom loading message
        showProgressBar: true,             // Show progress during loading
        animationDuration: 300,            // Animation speed (ms)
        hideWatermark: false,              // Hide GateFlow watermark (licensed only)
        customCSS: null                    // Path to custom CSS file
    },
    
    // === SECURITY SETTINGS ===
    security: {
        enableCSP: true,                   // Content Security Policy headers
        obfuscateErrorMessages: true,      // Hide detailed errors in production
        enableIntegrityCheck: true,        // Verify script integrity
        sessionTimeout: 3600000,           // Session timeout (1 hour)
        enableDomainLock: true,            // Lock license to specific domain
        antiTampering: true,               // Enable anti-tampering measures
        encryptLocalStorage: false         // Encrypt cached data
    },
    
    // === ANALYTICS & TRACKING ===
    analytics: {
        enableDetailedTracking: true,      // Track all user interactions
        trackScrollDepth: true,            // Monitor scroll engagement
        trackTimeOnPage: true,             // Track session duration
        trackDeviceInfo: true,             // Collect device information
        trackPerformanceMetrics: true,     // Monitor system performance
        enableHeatmaps: false,             // Enable click/scroll heatmaps
        customDimensions: {                // Custom analytics properties
            'content_type': 'course',
            'user_tier': 'premium',
            'ab_test_group': 'control'
        },
        providers: {                       // Analytics provider settings
            googleAnalytics: {
                enabled: true,
                trackingId: 'GA_TRACKING_ID'
            },
            segment: {
                enabled: false,
                writeKey: 'SEGMENT_WRITE_KEY'
            },
            facebookPixel: {
                enabled: false,
                pixelId: 'FB_PIXEL_ID'
            },
            customEndpoint: {
                enabled: false,
                url: 'https://your-analytics.com/track',
                headers: {
                    'Authorization': 'Bearer YOUR_TOKEN'
                }
            }
        }
    },
    
    // === ACCESSIBILITY ===
    accessibility: {
        enableAriaLabels: true,            // Add ARIA labels to elements
        enableKeyboardNav: true,           // Full keyboard navigation
        enableScreenReaderText: true,      // Hidden text for screen readers
        respectReducedMotion: true,        // Honor motion preferences
        enableHighContrast: true,          // Support high contrast mode
        enableFocusManagement: true,       // Manage focus for dynamic content
        announceChanges: true,             // Announce content changes
        keyboardShortcuts: {               // Custom keyboard shortcuts
            'Alt+L': 'toggleLogin',         // Open/close login form
            'Alt+R': 'refresh',             // Refresh access status
            'Escape': 'closeModal'          // Close modals
        }
    },
    
    // === FEATURE FLAGS ===
    features: {
        enableAutoRefresh: true,           // Refresh on tab focus
        enablePrefetch: true,              // Prefetch user permissions
        enableProgressTracking: true,      // Track user progress
        enableOfflineMode: false,          // Work offline with cached data
        enablePushNotifications: false,    // Browser push notifications
        enableWebRTC: false,               // WebRTC for real-time features
        enableServiceWorker: false,        // Service worker for caching
        enableWebAssembly: false           // WebAssembly for performance
    },
    
    // === CONTENT DELIVERY ===
    cdn: {
        enableCDN: false,                  // Use CDN for assets
        cdnBaseUrl: 'https://cdn.gateflow.pl',
        enableImageOptimization: false,    // Optimize images
        enableVideoStreaming: false,       // Adaptive video streaming
        preloadCriticalAssets: true,       // Preload important assets
        lazyLoadImages: true,              // Lazy load images
        enableCompression: true            // Enable asset compression
    },
    
    // === LOCALIZATION ===
    localization: {
        defaultLanguage: 'en',             // Default language
        enableAutoDetect: true,            // Auto-detect user language
        supportedLanguages: ['en', 'pl', 'es', 'de', 'fr'],
        translations: {
            'en': {
                'access_required': 'Access Required',
                'checking_access': 'Checking access...',
                'send_magic_link': 'Send Access Link',
                'get_access': 'Get Access Now'
            },
            'pl': {
                'access_required': 'Wymagany dostęp',
                'checking_access': 'Sprawdzanie dostępu...',
                'send_magic_link': 'Wyślij link dostępu',
                'get_access': 'Uzyskaj dostęp'
            }
        }
    },
    
    // === DEVELOPMENT & DEBUGGING ===
    development: {
        enableDebugMode: false,            // Enable debug console logs
        enableVerboseLogging: false,       // Extra detailed logging
        enablePerformanceMonitoring: true, // Monitor performance
        logLevel: 'info',                  // 'error', 'warn', 'info', 'debug'
        enableTestMode: false,             // Enable test mode
        mockResponses: false,              // Mock API responses
        bypassLicenseCheck: false,         // Bypass license validation
        showInternalMetrics: false,        // Show internal metrics
        enableA11yTesting: false           // Accessibility testing tools
    },
    
    // === INTEGRATION ===
    integrations: {
        stripe: {
            enabled: false,
            publishableKey: 'pk_test_...',
            enableCheckout: false
        },
        sendgrid: {
            enabled: false,
            apiKey: 'SG...',
            templateIds: {
                welcome: 'd-xxx',
                accessGranted: 'd-yyy'
            }
        },
        slack: {
            enabled: false,
            webhookUrl: 'https://hooks.slack.com/...',
            channel: '#alerts',
            notifyOnErrors: true
        },
        zapier: {
            enabled: false,
            webhookUrl: 'https://hooks.zapier.com/...',
            triggerEvents: ['access_granted', 'access_denied']
        }
    }
};

// === LICENSE INFORMATION ===
/*
GateFlow Licensing Plans:

🆓 OPEN SOURCE (Free)
- Unlimited personal/educational use
- Watermark displayed
- Community support
- Basic features

💼 PROFESSIONAL ($49/domain/year)
- Remove watermark
- Priority support
- Advanced analytics
- Custom branding

🏢 ENTERPRISE ($199/domain/year)
- Everything in Professional
- White-label solution
- Custom integrations
- Dedicated support
- SLA guarantee

🌍 MULTI-DOMAIN ($299/year)
- Use on unlimited domains
- All enterprise features
- Volume discounts available

Purchase licenses at: https://gateflow.pl/pricing
Support: support@gateflow.pl
Documentation: https://docs.gateflow.pl
*/
