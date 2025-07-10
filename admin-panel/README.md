# GateFlow Admin Panel

Modern admin panel for the GateFlow content protection system.

## Features

- ✅ **Modern UI** - Built with Next.js 15, Tailwind CSS 4, and TypeScript
- ✅ **Secure Authentication** - Magic link authentication via Supabase
- ✅ **Product Management** - Full CRUD operations for products
- ✅ **User Access Control** - Manage user permissions and access
- ✅ **Real-time Analytics** - Dashboard with key metrics
- ✅ **Dark Mode Support** - Automatic theme switching
- ✅ **Responsive Design** - Mobile-first approach
- ✅ **Docker Support** - One-command deployment

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Docker (optional)

### Installation

1. **Clone and setup**:
```bash
git clone <repository>
cd admin-panel
npm install
```

2. **Configure environment**:
```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

3. **Run development server**:
```bash
npm run dev
```

4. **Open** http://localhost:3000

### First Admin User

The first user to sign in becomes the admin automatically. Use the magic link authentication to get started.

## API Endpoints

### GateKeeper.js Dynamic Serving

The admin panel serves the `gatekeeper.js` file with dynamic configuration:

```
GET /api/gatekeeper
```

This endpoint automatically injects your Supabase credentials into the gatekeeper script.

### Usage in your websites

```html
<script src="http://localhost:3000/api/gatekeeper"></script>
```

## Configuration

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `ENABLE_MULTITENANT` - Enable multi-tenant mode (default: false)
- `NEXT_PUBLIC_SITE_URL` - Your site URL for redirects

### Supabase Setup

Make sure you have the following tables in your Supabase database:

1. **products** - Product definitions
2. **user_product_access** - User access permissions
3. **admin_users** - Admin user management (optional)

## Development

### Project Structure

```
src/
├── app/                 # Next.js app router
│   ├── api/            # API endpoints
│   ├── auth/           # Authentication
│   ├── dashboard/      # Admin dashboard
│   └── login/          # Login page
├── components/         # React components
├── lib/               # Utilities and Supabase config
└── types/             # TypeScript types
```

### Build for Production

```bash
npm run build
npm start
```

### Docker Deployment

```bash
docker build -t gateflow-admin .
docker run -p 3000:3000 gateflow-admin
```

## Security

- All routes are protected with middleware
- Admin access is validated on each request
- Sensitive operations require authentication
- Environment variables are properly configured

## Next Steps

1. **Add Products** - Create your first product in the dashboard
2. **Manage Users** - Grant access to users via the admin panel
3. **Integrate GateKeeper** - Use the dynamic API endpoint in your websites
4. **Monitor Analytics** - Track usage and performance

## Support

For support and questions, please refer to the GateFlow documentation or contact support.

---

**Version**: 1.0.0  
**License**: MIT  
**Built with**: Next.js 15, Tailwind CSS 4, TypeScript, Supabase
