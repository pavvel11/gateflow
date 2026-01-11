# =============================================================================
# GateFlow Admin Panel - Dockerfile (Bun)
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
FROM oven/bun:1-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy .stripe.example to .stripe if .stripe doesn't exist
RUN if [ ! -f .stripe ]; then cp .stripe.example .stripe; fi

# Build arguments with defaults
ARG NEXT_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}

RUN bun run build

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
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use bun to run the standalone server
CMD ["bun", "server.js"]
