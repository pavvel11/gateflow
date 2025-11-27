# =============================================================================
# GateFlow Admin Panel - Dockerfile
# =============================================================================
# This Dockerfile is compatible with TWO deployment scenarios:
#
# 1. admin-panel/docker-compose.yml (YOUR CURRENT SETUP)
#    - Environment variables from .env file
#    - NO build args needed
#    - Variables injected at runtime
#
# 2. docker-compose.fullstack.yml (Optional enterprise setup)
#    - Can optionally use build args
#    - But also works with runtime env vars
#
# Both work because Next.js 'standalone' mode reads NEXT_PUBLIC_* at runtime!
# =============================================================================
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy .stripe.example to .stripe if .stripe doesn't exist
RUN if [ ! -f .stripe ]; then cp .stripe.example .stripe; fi

# Build arguments with defaults (can be overridden by docker-compose build args)
ARG NEXT_TELEMETRY_DISABLED=1
# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
