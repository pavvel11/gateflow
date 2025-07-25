# 🎨 GateFlow Landing Page Templates

Professional, ready-to-use landing page templates for your GateFlow-protected products. Each template is designed for specific use cases and comes with comprehensive customization instructions.

## 📋 Available Templates

### 1. **Modern Light Course** (`modern-light-course.html`)

- **Best for**: Online courses, educational content, tutorials
- **Style**: Clean, light, modern design with blue accents
- **Target audience**: Students, professionals seeking skills
- **Key features**: Course modules, pricing table, testimonials

### 2. **Dark Premium VIP** (`dark-premium-vip.html`)

- **Best for**: High-ticket items, exclusive masterclasses, premium services
- **Style**: Elegant dark theme with gold/amber accents
- **Target audience**: High-achievers, business executives, VIP clients
- **Key features**: Exclusivity badges, social proof, premium positioning

### 3. **Creative Gradient Lead Magnet** (`creative-gradient-leadmagnet.html`)

- **Best for**: Free resources, e-books, design tools, lead magnets
- **Style**: Colorful gradients, creative and playful design
- **Target audience**: Creatives, designers, artists, content creators
- **Key features**: Free value emphasis, social proof, newsletter signup

### 4. **Professional Blue B2B** (`professional-blue-b2b.html`)

- **Best for**: Business tools, SaaS products, B2B services
- **Style**: Corporate, trustworthy, professional blue theme
- **Target audience**: Business owners, enterprises, professional teams
- **Key features**: ROI calculator, feature comparison, enterprise focus

### 5. **Warm Orange E-book** (`warm-orange-ebook.html`)

- **Best for**: E-books, guides, educational resources, lead magnets
- **Style**: Warm orange/amber theme, friendly and approachable
- **Target audience**: Authors, educators, content creators, marketers
- **Key features**: Content preview, author bio, download form, chapter breakdown

### 6. **Tech Stack Developer** (`tech-stack-developer.html`)

- **Best for**: Developer tools, APIs, technical products, SaaS for developers
- **Style**: Dark theme with tech-blue accents, code-focused design
- **Target audience**: Developers, technical teams, DevOps engineers
- **Key features**: Code examples, technical specs, demo section, developer-focused UI

## 🚀 Quick Setup Guide

### Step 1: Choose Your Template

Pick the template that best matches your product type and target audience.

### Step 2: Customize Content

Look for `<!-- EDIT: -->` comments throughout the HTML files. These mark all the areas you need to customize:

```html
<!-- EDIT: Replace with your product title -->
<h1>Your Product Name Here</h1>

<!-- EDIT: Replace with your product description -->
<p>Your compelling description...</p>
```

### Step 3: Configure GateFlow

1. Replace `'product-slug'` with your actual product slug:

```html
<div class="gateflow-protect" data-product-slug="your-product-slug">
```

1. Replace `'yourdomain.com'` with your actual domain:

```html
<script src="/api/gatekeeper?domain=yourdomain.com"></script>
```

### Step 4: Upload and Test

1. Upload the HTML file to your web server
1. Test the GateFlow protection functionality
1. Verify the purchase flow works correctly

## 🎯 Customization Areas

### Required Changes

- **Product Information**: Title, description, pricing
- **GateFlow Configuration**: Product slug, domain
- **Contact Information**: Footer details, support links
- **Branding**: Logo, company name, colors

### Optional Customizations

- **Colors**: Modify Tailwind color scheme in the `<script>` section
- **Images**: Add your own product images or screenshots
- **Content Sections**: Add/remove sections as needed
- **Social Proof**: Update testimonials and statistics

## 🎨 Color Customization

Each template uses Tailwind CSS with custom color schemes. You can easily change colors by modifying the config:

```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#YOUR_PRIMARY_COLOR',
                secondary: '#YOUR_SECONDARY_COLOR',
                accent: '#YOUR_ACCENT_COLOR'
            }
        }
    }
}
```

### Template Color Schemes

| Template | Primary | Secondary | Accent |
|----------|---------|-----------|--------|
| Modern Light | #3B82F6 (Blue) | #1E40AF (Dark Blue) | - |
| Dark Premium | #F59E0B (Amber) | #D97706 (Orange) | - |
| Creative Gradient | #EC4899 (Pink) | #8B5CF6 (Purple) | #F59E0B (Amber) |
| Professional Blue | #2563EB (Blue) | #1E40AF (Dark Blue) | #60A5FA (Light Blue) |
| Warm Orange E-book | #F97316 (Orange) | #EA580C (Dark Orange) | - |
| Tech Stack Developer | #0EA5E9 (Tech Blue) | #0284C7 (Dark Blue) | #0F172A (Code Dark) |

## 📱 Responsive Design

All templates are fully responsive and work perfectly on:

- 📱 Mobile phones (320px+)
- 📱 Tablets (768px+)
- 💻 Laptops (1024px+)
- 🖥️ Desktops (1280px+)

## 🔧 Advanced Customization

### Adding New Sections

All templates use Tailwind CSS, making it easy to add new sections:

```html
<section class="py-16 bg-gray-50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Your content here -->
    </div>
</section>
```

### Modifying Layouts

Templates use CSS Grid and Flexbox for layouts. Common patterns:

```html
<!-- Two-column layout -->
<div class="grid md:grid-cols-2 gap-8">
    <div>Column 1</div>
    <div>Column 2</div>
</div>

<!-- Three-column layout -->
<div class="grid md:grid-cols-3 gap-8">
    <div>Column 1</div>
    <div>Column 2</div>
    <div>Column 3</div>
</div>
```

## 🛡️ GateFlow Integration

### Content Protection

Wrap any content you want to protect:

```html
<div class="gateflow-protect" data-product-slug="your-product">
    <!-- Protected content here -->
</div>
```

### Free Lead Magnets

For free products that require email registration:

```html
<div class="gateflow-protect" data-product-slug="free-ebook" data-price="0">
    <!-- Free content that requires email -->
</div>
```

### Multiple Products

You can protect different sections with different products:

```html
<div class="gateflow-protect" data-product-slug="basic-course">
    <!-- Basic course content -->
</div>

<div class="gateflow-protect" data-product-slug="premium-course">
    <!-- Premium course content -->
</div>
```

## ✅ Pre-Launch Checklist

Before going live, make sure you've:

- [ ] Replaced all placeholder content with your actual content
- [ ] Updated the product slug in GateFlow protection
- [ ] Changed the domain in the GateFlow script
- [ ] Added your branding (logo, colors, company name)
- [ ] Updated contact information in the footer
- [ ] Tested the purchase flow
- [ ] Verified responsive design on different devices
- [ ] Checked all links work correctly
- [ ] Added your analytics tracking code (if needed)

## 🎯 Best Practices

### Content Strategy

- **Headlines**: Make them benefit-focused and specific
- **Descriptions**: Focus on outcomes, not features
- **Social Proof**: Use real testimonials and numbers
- **CTAs**: Make them action-oriented and urgent

### SEO Optimization

- Update the `<title>` tag for each page
- Add meta descriptions
- Use proper heading hierarchy (H1, H2, H3)
- Add alt text to images

### Performance

- Optimize images before adding them
- Test page load speed
- Ensure GateFlow script loads properly

## 🆘 Troubleshooting

### Common Issues

**GateFlow not working:**

- Check that the domain matches exactly
- Verify the product slug exists in your dashboard
- Ensure the script is loading (check browser console)

**Layout issues:**

- Check for proper HTML structure
- Verify Tailwind CSS is loading from CDN
- Test on different screen sizes

**Styling problems:**

- Confirm custom colors are properly defined
- Check for conflicting CSS rules
- Validate HTML structure

## 📞 Support

Need help customizing your template?

- 📧 Email: <support@gateflow.pl>
- 📚 Documentation: <https://docs.gateflow.pl>
- 💬 Community: <https://discord.gg/gateflow>

---

## Happy building! 🚀

Remember: These templates are designed to be starting points. Feel free to modify them extensively to match your brand and requirements.
