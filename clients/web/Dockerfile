# ==============================================================================
# Multi-stage Dockerfile for AgroLoop Next.js Web Client (Monorepo)
# ==============================================================================

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
WORKDIR /app

# ------------------------------------------------------------------------------
# 1. Builder Stage
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Copy monorepo workspace configuration, lockfile, and package sources
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY patches ./patches
COPY openapi ./openapi
COPY packages ./packages
COPY web ./web
COPY mobile ./mobile
COPY desktop ./desktop

# Install workspace dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Build-time environment variables
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NODE_ENV=production

# Build @agroloop/web and its dependencies (@agroloop/api-client, @agroloop/api-types)
RUN pnpm turbo build --filter=@agroloop/web

# ------------------------------------------------------------------------------
# 2. Production Runner Stage
# ------------------------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV BACKEND_API_URL="http://app:8080"

# Non-root user for secure execution
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server and assets
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./web/public

USER nextjs

EXPOSE 3000

CMD ["node", "web/server.js"]
