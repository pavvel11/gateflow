# 🚀 Quick Installation Guide - GateFlow v8.0

Get up and running with GateFlow in under 5 minutes!

## Prerequisites

- ✅ Supabase project
- ✅ Basic web hosting
- ✅ 5 minutes of your time

## Step 1: Database Setup (2 minutes)

### 1.1 Create Tables

Copy and run these SQL scripts in your Supabase SQL editor:

**Products Table:**
```sql
-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample products
INSERT INTO products (slug, name, price) VALUES
('free-course', 'Free Introduction Course', 0),
('premium-course', 'Premium Advanced Course', 99.00),
('advanced-course', 'Advanced Masterclass', 199.00);
```

**User Access Table:**
```sql
-- Create user_product_access table
CREATE TABLE user_product_access (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_slug VARCHAR(255) REFERENCES products(slug) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_slug)
);

-- Enable Row Level Security
ALTER TABLE user_product_access ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own access" ON user_product_access
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own access" ON user_product_access
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 1.2 Test Database
Go to `debug/database-debug.html` to verify your setup.

## Step 2: Configure Gatekeeper (1 minute)

### 2.1 Update Credentials

Edit `gatekeeper.js` lines 6-7:
```javascript
const SUPABASE_URL = 'your-project-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 2.2 Basic Configuration

Add to your HTML pages:
```html
<script>
    window.gatekeeperConfig = {
        productSlug: 'premium-course',     // Your product slug
        gateflowLicense: 'GFLOW-XXXX-XXXX' // Optional: Your license key
    };
</script>
<script src="gatekeeper.js"></script>
```

## Step 3: Implementation (2 minutes)

### 3.1 Page Protection
```html
<!DOCTYPE html>
<html>
<head>
    <title>Protected Page</title>
</head>
<body>
    <h1>Premium Content</h1>
    <p>This page is protected!</p>
    
    <script>
        window.gatekeeperConfig = {
            productSlug: 'premium-course'
        };
    </script>
    <script src="gatekeeper.js"></script>
</body>
</html>
```

### 3.2 Element Protection
```html
<!-- Free content (always visible) -->
<div data-free>
    <h2>Try Our Free Course!</h2>
    <button>Start Free Course</button>
</div>

<!-- Premium content (requires access) -->
<div data-paid>
    <h2>Welcome Back, Premium Member!</h2>
    <button>Continue Learning</button>
</div>

<!-- Specific product protection -->
<div data-gatekeeper-product="advanced-course">
    <h2>Advanced Techniques</h2>
    <p>Master-level content here...</p>
</div>
```

### 3.3 Add Noscript Fallback
```html
<noscript>
    <meta http-equiv="refresh" content="0;url=/?product=premium-course"/>
</noscript>
```

## Step 4: Test Everything

1. **Open your page** - Should show login form
2. **Enter email** - Check for magic link email
3. **Click magic link** - Should grant access if product is free
4. **Verify protection** - Check that paid content is hidden/removed

## 🎉 You're Done!

### What You Get Out of the Box:

- ✅ **Secure Protection** - Content removed from DOM, not just hidden
- ✅ **Magic Link Auth** - Seamless email-based authentication
- ✅ **Free Product Support** - Automatic access for price = 0 products
- ✅ **Mobile Friendly** - Responsive design everywhere
- ✅ **Analytics Ready** - Built-in event tracking
- ✅ **Error Recovery** - Graceful fallbacks and retry logic

### Advanced Features (Optional):

Want more? Add advanced configuration:

```javascript
window.gatekeeperAdvancedConfig = {
    ui: {
        theme: 'auto',           // Auto dark/light theme
        showProgressBar: true    // Loading animations
    },
    analytics: {
        enableDetailedTracking: true,  // Full analytics
        trackScrollDepth: true,        // User engagement
        customDimensions: {
            'content_type': 'course'
        }
    },
    accessibility: {
        enableAriaLabels: true,        // Screen reader support
        enableScreenReaderText: true
    },
    performance: {
        enableQueryCache: true,        // 5-minute cache
        retryAttempts: 3              // Auto-retry failures
    }
};
```

## 🆘 Need Help?

- 📁 **Examples**: Check `/examples/` folder for complete demos
- 🐛 **Debug**: Use `/debug/` tools to troubleshoot
- 📖 **Documentation**: Read full `README.md`
- 🧪 **Testing**: Try `examples/performance-test.html`

## Common Issues

**❌ Login form not showing?**
- Check Supabase URL/key in `gatekeeper.js`
- Verify `gatekeeperConfig.productSlug` is set

**❌ Elements not being protected?**
- Check data attributes: `data-gatekeeper-product`, `data-paid`, `data-free`
- Verify script is loading: `<script src="gatekeeper.js"></script>`

**❌ Magic links not working?**
- Check email template is enabled in Supabase Auth settings
- Verify redirect URL matches your domain

**❌ Access not being granted?**
- Check product exists in database with correct slug
- Verify product price is 0 for free products
- Check RLS policies are correctly set

## 🚀 Go Live!

1. Upload files to your web server
2. Update production Supabase credentials
3. Test with real users
4. Monitor analytics and performance

**That's it! You now have enterprise-grade content protection with GateFlow! 🎉**

## 💼 GateFlow Licensing

- **🆓 Open Source**: Free with watermark displayed
- **💼 Professional**: $49/domain/year - Remove watermark, priority support  
- **🏢 Enterprise**: $199/domain/year - White-label, custom integrations
- **🌍 Multi-Domain**: $299/year - Unlimited domains

[**Purchase License**](https://gateflow.pl/pricing) to remove the watermark and unlock enterprise features!
