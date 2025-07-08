// Advanced Gatekeeper Configuration Example
// Copy this to advanced-config.js and customize for your needs

window.gatekeeperAdvancedConfig = {
    // Performance Settings
    performance: {
        batchSize: 50,                    // Max elements to check in single batch
        queryTimeout: 5000,               // Database query timeout (ms)
        retryAttempts: 3,                 // Number of retry attempts on failure
        cacheExpiry: 300000,             // Cache expiry time (5 minutes)
        enableQueryCache: true,           // Cache query results for better performance
        preloadUserAccess: true           // Preload user access data on page load
    },
    
    // UI/UX Enhancements
    ui: {
        loadingAnimation: 'pulse',        // 'pulse', 'spinner', 'bars', 'custom'
        loadingMessage: 'Checking access...', 
        errorTitle: 'Access Check Failed',
        successMessage: 'Access granted!',
        theme: 'auto',                   // 'light', 'dark', 'auto'
        showProgressBar: true,
        animationDuration: 300           // Animation duration in ms
    },
    
    // Security Settings
    security: {
        enableCSP: true,                 // Content Security Policy headers
        preventInspection: false,        // Disable right-click/dev tools (not recommended)
        obfuscateErrorMessages: true,    // Hide technical error details from users
        enableIntegrityCheck: true,      // Verify script integrity
        sessionTimeout: 3600000,         // Session timeout (1 hour)
        requireReauth: false             // Require re-authentication for sensitive products
    },
    
    // Analytics & Monitoring
    analytics: {
        enableDetailedTracking: true,    // Track detailed user interactions
        trackScrollDepth: true,          // Track how far users scroll
        trackTimeOnPage: true,           // Track time spent on protected content
        trackDeviceInfo: true,           // Track device/browser information
        enableHeatmaps: false,           // Enable heatmap tracking (requires external service)
        customDimensions: {              // Custom analytics dimensions
            'user_tier': 'free',
            'content_type': 'course'
        }
    },
    
    // Accessibility
    accessibility: {
        enableAriaLabels: true,          // Add ARIA labels to elements
        enableKeyboardNav: true,         // Keyboard navigation support
        enableScreenReaderText: true,    // Screen reader compatibility
        highContrastMode: false,         // High contrast mode
        respectReducedMotion: true       // Respect prefers-reduced-motion
    },
    
    // Advanced Features
    features: {
        enableAutoRefresh: true,         // Auto-refresh access on focus
        enableOfflineMode: false,        // Limited offline functionality
        enablePrefetch: true,            // Prefetch user data
        enableLazyLoading: true,         // Lazy load protected content
        enableProgressTracking: true,    // Track user progress through content
        enableBookmarks: false,          // Allow users to bookmark progress
        enableNotifications: false       // Web push notifications
    },
    
    // Content Delivery
    content: {
        enableCDN: false,               // Use CDN for assets
        compressionLevel: 'medium',     // 'low', 'medium', 'high'
        enableImageOptimization: true,  // Optimize images based on access
        enableVideoStreaming: false,    // Progressive video streaming
        maxConcurrentLoads: 5           // Max concurrent content loads
    },
    
    // Developer Tools
    development: {
        enableDebugMode: false,         // Detailed console logging
        enablePerformanceMonitoring: true, // Performance metrics
        enableErrorReporting: true,     // Automatic error reporting
        mockUserStates: [],            // Mock different user states for testing
        enableTestingMode: false,       // Special testing features
        logLevel: 'info'               // 'debug', 'info', 'warn', 'error'
    }
};
