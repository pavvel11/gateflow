#!/bin/bash
set -e

echo "🚀 Deploying GateFlow..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed. Install with: npm install -g pm2${NC}"
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes from git...${NC}"
git pull origin main || {
    echo -e "${RED}❌ Git pull failed. Please resolve conflicts manually.${NC}"
    exit 1
}

# Navigate to admin-panel
cd admin-panel

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install || {
    echo -e "${RED}❌ npm install failed${NC}"
    exit 1
}

# Build application
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}

# Go back to root
cd ..

# Check if PM2 is already running
if pm2 list | grep -q "gateflow-admin"; then
    echo -e "${YELLOW}🔄 Reloading PM2 (zero-downtime)...${NC}"
    pm2 reload ecosystem.config.js || {
        echo -e "${RED}❌ PM2 reload failed${NC}"
        exit 1
    }
else
    echo -e "${YELLOW}🚀 Starting PM2...${NC}"
    pm2 start ecosystem.config.js || {
        echo -e "${RED}❌ PM2 start failed${NC}"
        exit 1
    }
fi

# Save PM2 process list
pm2 save

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 list          - List all processes"
echo "  pm2 monit         - Monitor in real-time"
echo "  pm2 logs          - View logs"
echo "  pm2 restart all   - Restart all processes"
