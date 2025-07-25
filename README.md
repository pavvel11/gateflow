# 🚀 GateFlow - Professional Content Access Control System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

> **Transform your content into a revenue-generating machine with enterprise-grade access control.**

GateFlow is a comprehensive content access control and monetization platform that combines powerful authentication, flexible payment processing, and intuitive content protection. Whether you're selling digital products, courses, or premium content, GateFlow provides everything you need to secure and monetize your offerings.

## ✨ Key Features

### 🔐 **Advanced Access Control**

- **Multi-mode Protection**: Page-level, element-level, and toggle-based content gating
- **Role-based Permissions**: Granular control over user access levels
- **Time-based Access**: Set expiration dates and temporary access grants
- **Domain-based Licensing**: Secure deployment with watermark system

### 💳 **Integrated Payment System**

- **Stripe Integration**: Complete payment processing with webhooks
- **Guest Checkout**: Allow purchases without account creation
- **Multiple Currencies**: Support for 30+ international currencies
- **Refund Management**: Built-in refund tracking and administration
- **Lead Generation**: Offer free products in exchange for email registration to build newsletter base

### 🎨 **Rich User Experience**

- **Magic Link Authentication**: Passwordless login via email
- **Responsive Design**: Beautiful UI that works on all devices
- **Theme System**: Light/dark mode with customizable styling
- **Internationalization**: Multi-language support (English, Polish)

### 📊 **Powerful Administration**

- **Real-time Dashboard**: Monitor sales, users, and analytics
- **Product Management**: Create and manage digital products
- **User Administration**: Comprehensive user and access management
- **Analytics & Reporting**: Detailed insights into your business

### 🛡️ **Enterprise Security**

- **Row Level Security**: Database-level access control with Supabase RLS
- **Rate Limiting**: Advanced protection against abuse
- **Audit Logging**: Complete tracking of administrative actions
- **SQL Injection Protection**: Parameterized queries and input validation

## 🏗️ Architecture

```mermaid
graph TB
    A[Frontend - Next.js Admin Panel] --> B[Supabase Auth]
    A --> C[Supabase Database]
    A --> D[Stripe Payments]
    E[GateFlow.js SDK] --> B
    E --> C
    F[Protected Content] --> E
    G[Guest Users] --> E
    H[Registered Users] --> E
    
    subgraph "Database Layer"
        C --> I[Products]
        C --> J[User Access]
        C --> K[Payment Transactions]
        C --> L[Admin Audit Log]
    end
    
    subgraph "Security Layer"
        M[Rate Limiting]
        N[RLS Policies]
        O[Input Validation]
        P[Audit Logging]
    end

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ and npm/yarn
- Supabase account
- Stripe account (for payments)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/gateflow-access-control.git
cd gateflow-access-control

# Install main dependencies
npm install

# Install admin panel dependencies
cd admin-panel
npm install
cd ..
```

### 2. Database Setup

```bash
# Initialize Supabase project
npx supabase init

# Start local development
npx supabase start

# Run migrations
npx supabase db reset
```

### 3. Environment Configuration

Create `.env.local` in the admin panel directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Launch the Application

```bash
# Start the admin panel
cd admin-panel
npm run dev

# In another terminal, serve examples
cd ..
npm run dev
```

Visit:

- **Admin Panel**: <http://localhost:3000>
- **Examples**: <http://localhost:8000>

## 📖 Usage Examples

### Basic Content Protection

```html
<!DOCTYPE html>
<html>
<head>
    <title>Protected Content</title>
</head>
<body>
    <!-- Free content visible to everyone -->
    <div class="free-content">
        <h1>Welcome to Our Platform</h1>
        <p>This content is free for everyone...</p>
    </div>

    <!-- Protected content requires purchase -->
    <div class="gateflow-protect" data-product-slug="premium-course">
        <h2>Premium Course Content</h2>
        <p>This exclusive content is only available to paying customers...</p>
    </div>

    <!-- Free content that requires email registration (lead magnet) -->
    <div class="gateflow-protect" data-product-slug="free-ebook" data-price="0">
        <h2>Free Marketing Guide</h2>
        <p>Get our comprehensive marketing guide by providing your email address...</p>
    </div>

    <!-- Initialize GateFlow -->
    <script src="/api/gatekeeper?domain=yourdomain.com"></script>
</body>
</html>
```

### Element-Level Protection

```html
<!-- Protect specific elements -->
<div class="gateflow-element" 
     data-product-slug="advanced-tutorials"
     data-fallback="Please purchase our Advanced Tutorials to access this content.">
    <video src="premium-tutorial.mp4" controls></video>
</div>

<!-- Toggle-based protection -->
<button class="gateflow-toggle" 
        data-product-slug="pro-features"
        data-show-text="Hide Advanced Settings"
        data-hide-text="Unlock Advanced Settings">
    Toggle Pro Features
</button>
```

### JavaScript API Integration

```javascript
// Check user access programmatically
GateFlow.checkAccess('premium-course').then(hasAccess => {
    if (hasAccess) {
        // Load premium content
        loadPremiumFeatures();
    } else {
        // Show purchase options
        GateFlow.showPurchaseModal('premium-course');
    }
});

// Handle free products for lead generation
GateFlow.checkAccess('free-ebook').then(hasAccess => {
    if (!hasAccess) {
        // Show email registration form for free product
        GateFlow.showPurchaseModal('free-ebook');
    }
});

// Listen to access events
GateFlow.on('access_granted', (event) => {
    console.log('User gained access to:', event.productSlug);
    if (event.price === 0) {
        // Handle free product access - new lead captured!
        trackNewLead(event.customerEmail);
    }
    refreshContent();
});

// Track custom events
GateFlow.track('video_completed', { 
    product: 'advanced-course',
    duration: 1200 
});
```

## 🎨 Customization

### Theme Configuration

```javascript
// config.js
window.GATEFLOW_CONFIG = {
    theme: {
        primaryColor: '#667eea',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        fontFamily: 'Inter, sans-serif'
    },
    ui: {
        showWatermark: false, // Requires license
        modalAnimation: 'slideUp',
        loadingSpinner: 'dots'
    }
};
```

### Advanced Configuration

```javascript
window.GATEFLOW_CONFIG = {
    supabase: {
        url: 'your-supabase-url',
        anonKey: 'your-anon-key'
    },
    features: {
        enableAnalytics: true,
        enableCaching: true,
        debugMode: false
    },
    protection: {
        fallbackMode: 'show_free', // 'hide_all', 'show_all', 'show_free'
        gracefulDegradation: true
    }
};
```

## 🛠️ Development

### Project Structure

gateflow-access-control/
├── 📁 admin-panel/          # Next.js admin dashboard
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   ├── lib/             # Utility functions
│   │   └── types/           # TypeScript definitions
│   └── package.json
├── 📁 examples/             # Demo implementations
│   ├── 1-free-content.html
│   ├── 2-page-protection.html
│   ├── 3-element-protection.html
│   └── ...
├── 📁 supabase/             # Database schema & migrations
│   ├── migrations/
│   └── config.toml
├── 📁 themes/               # CSS theme files
├── gatekeeper.js            # Core JavaScript SDK
├── config.example.js        # Configuration template
└── package.json

### Available Scripts

```bash
# Development
npm run dev              # Start demo server
cd admin-panel && npm run dev  # Start admin panel

# Production
npm run build            # Build for production
npm start               # Start production server

# Database
npx supabase db reset    # Reset database
npx supabase db push     # Push schema changes
npx supabase gen types typescript --local > types/database.ts

# Quality
npm run lint            # Run linting
npm test               # Run tests
```

### Database Schema

The system uses a comprehensive PostgreSQL schema with:

- **Products**: Manage digital products and pricing
- **User Access**: Track user permissions and expiration
- **Payment Transactions**: Complete payment history with Stripe integration
- **Guest Purchases**: Handle purchases before account creation
- **Admin Actions**: Audit log for administrative activities
- **Rate Limiting**: Prevent abuse and ensure fair usage

Key tables include advanced features like:

- Row Level Security (RLS) policies
- Optimistic locking for concurrent access
- Comprehensive input validation
- Audit logging for all administrative actions

## 🔧 API Reference

### Core Methods

#### `GateFlow.checkAccess(productSlug)`

Check if the current user has access to a product.

```javascript
const hasAccess = await GateFlow.checkAccess('premium-course');
```

#### `GateFlow.showPurchaseModal(productSlug)`

Display the purchase modal for a specific product.

```javascript
GateFlow.showPurchaseModal('advanced-features');
```

#### `GateFlow.track(eventName, data)`

Track custom analytics events.

```javascript
GateFlow.track('feature_used', { feature: 'export', format: 'pdf' });
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `theme.primaryColor` | string | `#667eea` | Primary brand color |
| `theme.backgroundColor` | string | `#ffffff` | Modal background color |
| `ui.showWatermark` | boolean | `true` | Show/hide GateFlow watermark |
| `features.enableAnalytics` | boolean | `true` | Enable event tracking |
| `protection.fallbackMode` | string | `show_free` | Behavior when access check fails |

## 📊 Analytics & Monitoring

GateFlow provides comprehensive analytics out of the box:

### Built-in Events

- **Access Events**: `access_granted`, `access_denied`
- **Purchase Events**: `purchase_completed`, `purchase_failed`
- **User Events**: `login_shown`, `magic_link_sent`
- **Performance Events**: `cache_hit`, `api_response_time`
- **Lead Generation Events**: `lead_captured`, `free_product_accessed`

### Custom Event Tracking

```javascript
// Track user interactions
GateFlow.track('video_started', { 
    productSlug: 'course-basics',
    videoId: 'intro-001',
    timestamp: Date.now()
});

// Track business metrics
GateFlow.track('conversion_funnel', {
    step: 'pricing_page_viewed',
    source: 'organic',
    plan: 'premium'
});

// Track lead generation success
GateFlow.track('lead_captured', {
    productSlug: 'free-ebook',
    source: 'blog_post',
    leadMagnet: 'marketing_guide'
});
```

## 🌍 Internationalization

GateFlow supports multiple languages with easy configuration:

```javascript
window.GATEFLOW_CONFIG = {
    locale: 'pl', // 'en', 'pl'
    messages: {
        'access_denied': 'Dostęp zabroniony',
        'purchase_required': 'Wymagany zakup',
        // ... custom translations
    }
};
```

Supported languages:

- 🇺🇸 English (default)
- 🇵🇱 Polish
- 🔄 More languages coming soon

## 🚀 Deployment

### Production Checklist

- [ ] Configure production Supabase project
- [ ] Set up Stripe webhook endpoints
- [ ] Update environment variables
- [ ] Configure custom domain
- [ ] Enable SSL/TLS certificates
- [ ] Set up monitoring and logging
- [ ] Test payment flows end-to-end

### Deployment Options

#### Vercel (Recommended)

```bash
npx vercel --prod
```

#### Traditional Hosting

```bash
npm run build
npm start
```

#### Docker

```bash
docker build -t gateflow .
docker run -p 3000:3000 gateflow
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Submit a pull request

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Write comprehensive tests
- Document public APIs
- Use conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Commercial Licensing

GateFlow operates under a freemium model:

- **Free**: Full functionality with GateFlow watermark
- **Pro ($49/domain/year)**: Remove watermark, priority support
- **Enterprise**: Custom licensing for large deployments

## 🆘 Support

- 📧 **Email**: <support@gateflow.pl>
- 🌐 **Website**: <https://gateflow.pl>
- 📚 **Documentation**: <https://docs.gateflow.pl>
- 💬 **Discord**: <https://discord.gg/gateflow>
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/gateflow-access-control/issues)

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) for the incredible backend-as-a-service platform
- [Stripe](https://stripe.com/) for robust payment processing
- [Next.js](https://nextjs.org/) for the powerful React framework
- [Tailwind CSS](https://tailwindcss.com/) for beautiful, responsive styling

---

---

**[🌟 Star this repo](https://github.com/yourusername/gateflow-access-control) | [🚀 Try the demo](https://demo.gateflow.pl) | [📖 Read the docs](https://docs.gateflow.pl)**

Made with ❤️ by the GateFlow team
