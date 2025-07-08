# GateFlow v8.0 - Enterprise Content Protection System

A modern, enterprise-grade access control system for product delivery and content protection built on Supabase with advanced performance, analytics, and accessibility features.

## 🔐 GateFlow Licensing

GateFlow offers flexible licensing options for different use cases:

- **🆓 Open Source**: Free for personal/educational use (watermark displayed)
- **💼 Professional**: $49/domain/year (remove watermark, priority support)
- **🏢 Enterprise**: $199/domain/year (white-label, custom integrations)
- **🌍 Multi-Domain**: $299/year (unlimited domains)

[**Purchase License**](https://gateflow.pl/pricing) | [**Documentation**](https://docs.gateflow.pl)

## 🚀 Features

### Core Protection

- **Page Protection** - Protect entire pages based on product access
- **Element Protection** - Show/hide specific elements based on access
- **Toggle Elements** - Dynamic content switching for users with/without access
- **Magic Link Authentication** - Seamless email-based login
- **Free Product Support** - Automatic access grants for free products
- **Database-Driven** - All decisions based on Supabase database

### 🔒 Security Features

- **DOM Removal**: Protected content is completely removed from DOM (not just hidden)
- **No Hidden Content**: Protected content never reaches client-side when user shouldn't see it
- **🚫 Anti-Bypass Protection** - Noscript redirects prevent JavaScript-disabled bypass attempts
- **Database Verification**: All access checks validated against Supabase database
- **Session-Based**: User authentication managed securely through Supabase Auth

### ⚡ Performance Optimization

- **Batch Access Checks** - Multiple products checked in single query for optimal speed
- **Intelligent Caching** - 5-minute TTL cache with automatic invalidation
- **Retry Logic** - Automatic retry for transient failures with exponential backoff
- **Performance Monitoring** - Built-in metrics and timing for optimization
- **Preload User Access** - Optional preloading of user permissions
- **Query Timeout Protection** - Prevents hanging queries

### 📊 Advanced Analytics

- **Comprehensive Event Tracking** - All user interactions and system events
- **Scroll Depth Tracking** - Monitor user engagement with content
- **Time on Page Metrics** - Track user session duration and engagement
- **Device Information** - Browser, platform, and capability detection
- **Custom Dimensions** - Extensible analytics with custom properties
- **Multi-Provider Support** - Google Analytics, Segment, Facebook Pixel, custom endpoints
- **Performance Metrics** - Load times, cache hits, error rates

### 🛡️ Error Handling & Resilience

- **Graceful Fallbacks** - Configurable behavior when services are unavailable
- **Smart Error Recovery** - Development vs production error handling
- **User-Friendly Error Pages** - Beautiful error pages with recovery options
- **Fallback Modes**: `show_all`, `hide_all`, `show_free`

### 🎨 Enhanced User Experience

- **Beautiful Loading States** - Theme-aware loading animations
- **Theme Support** - Light, dark, and auto themes based on user preference
- **Auto-Refresh** - Refresh access when user returns to tab
- **Progress Tracking** - Monitor user progress through content
- **Smooth Animations** - Respectful of user motion preferences
- **Progressive Enhancement** - Works without JavaScript with fallbacks

### ♿ Accessibility First

- **ARIA Labels & Roles** - Full screen reader compatibility
- **Keyboard Navigation** - Complete keyboard accessibility
- **Screen Reader Text** - Hidden descriptive text for assistive technology
- **High Contrast Support** - Respects user contrast preferences
- **Reduced Motion** - Honors prefers-reduced-motion settings
- **Focus Management** - Proper focus handling for dynamic content

## 📁 Project Structure

```
├── gatekeeper.js           # Main gatekeeper script (refactored, clean code)
├── config.js              # Supabase configuration for index.html
├── index.html             # Main index/checkout page
├── examples/              # Example implementations
│   ├── protected-product.html  # Page protection example
│   ├── test-mixed.html        # Element protection example
│   ├── test-toggle.html       # Toggle elements demo
│   ├── landing-page.html      # Dynamic landing page example
│   └── elements-example.html  # Basic elements example
├── sql/                   # Database setup scripts
│   ├── gateflow_setup.sql     # Products table setup
│   └── user_product_access_setup.sql # User access table setup
├── debug/                 # Development and debugging tools
│   ├── database-debug.html    # Database state debugging
│   ├── debug-protected.html   # Protection debugging
│   └── quick-setup.html       # Quick setup verification
├── layouts/               # Layout templates
│   └── default.html
├── themes/                # CSS themes
├── supabase/              # Supabase functions
└── README.md              # This file
```

## 🛠️ Setup

### 1. Database Setup

Run the SQL scripts in your Supabase dashboard:

- `sql/gateflow_setup.sql` - Creates products table
- `sql/user_product_access_setup.sql` - Creates user access table

### 2. Configuration

Update the Supabase credentials in `gatekeeper.js` and `config.js`:

```javascript
const SUPABASE_URL = 'your-project-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 3. Implementation

Add to your HTML pages:

```html
<script>
    window.gatekeeperConfig = {
        productSlug: 'your-product-slug'
    };
</script>
<script src="gatekeeper.js"></script>
```

## 🎯 Usage Examples

### Page Protection
Protects entire page - shows login form if no access:
```html
<script>
    window.gatekeeperConfig = {
        productSlug: 'premium-course'
    };
</script>
```

### Element Protection

**🔒 Security**: Protected elements are completely removed from DOM when user lacks access (not just hidden).

```html
<div data-gatekeeper-product="premium-course">
    Premium content here
</div>
```

### Toggle Elements

Different content for users with/without access:

**🔒 Security**: `data-paid` elements are removed from DOM when user lacks access.

```html
<!-- For users without access -->
<div data-free>
    <h2>Buy now for $99</h2>
    <button>Purchase</button>
</div>

<!-- For users with access -->
<div data-paid>
    <h2>Welcome back!</h2>
    <button>Continue Learning</button>
</div>
```

## 🔧 API Reference

### Configuration
```javascript
window.gatekeeperConfig = {
    productSlug: 'product-slug',         // Required: Product to protect
    gateflowLicense: 'GFLOW-XXXX-XXXX',  // Optional: License key (removes watermark)
    showLoadingState: true,              // Optional: Show loading animation (default: true)
    fallbackMode: 'hide_all',            // Optional: 'show_all', 'hide_all', 'show_free' (default: 'hide_all')
    development: false,                  // Optional: Show detailed errors (default: false)
    analyticsEndpoint: 'https://your-analytics.com/events'  // Optional: Custom analytics endpoint
};
```

### Analytics & Tracking

Gatekeeper automatically tracks key events for optimization:

```javascript
// Events tracked:
// - gatekeeper_access_granted
// - gatekeeper_access_denied  
// - gatekeeper_login_form_shown
// - gatekeeper_magic_link_sent
// - gatekeeper_free_product_granted
// - gatekeeper_element_removed_security
// - gatekeeper_batch_check_performed
// - gatekeeper_error_occurred

// Works with: Google Analytics, Segment, Facebook Pixel
// Automatically detects: window.gtag, window.analytics, window.fbq
```

### Fallback Modes

Configure behavior when errors occur:

- **`hide_all`** (default): Show error page, safest for production
- **`show_free`**: Remove only paid content, show free content
- **`show_all`**: Show everything, good for development

### Data Attributes
- `data-gatekeeper-product="slug"` - Protect element based on product access
- `data-free` - Show when user doesn't have access
- `data-paid` - Show when user has access

### URL Parameters
- `?product=slug` - Automatic access grant for free products

### Noscript Fallback
For pages with JavaScript disabled, add a fallback redirect:
```html
<noscript>
    <meta http-equiv="refresh" content="0;url=/?product=your-main-product-slug"/>
</noscript>
```
**Important**: Match the product slug to your page's main protected content.

## 🚀 Deployment

1. Upload files to your web server
2. Configure Supabase credentials
3. Set up database tables
4. Test with your products

## 📝 License

MIT License - feel free to use in your projects!

## 🤝 Contributing

Feel free to submit issues and enhancement requests!
