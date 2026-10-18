# ==============================================================================
# Multi-stage Dockerfile for AgroLoop Next.js Web Client (Monorepo)
# ==============================================================================

FROM node:24-alpine AS base
ENV PNPM_CONFIG_UPDATE_NOTIFIER=false
RUN corepack enable && corepack prepare pnpm@12.11.2 --activate
WORKDIR /app

# ------------------------------------------------------------------------------
# 1. Builder Stage
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Copy only the files needed to build @agroloop/web
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY patches ./patches
COPY openapi ./openapi
COPY packages ./packages
COPY web ./web

# Exclude non-web workspaces (mobile, desktop) so only web dependencies are resolved
RUN node -e "const fs = require('fs'); const ws = fs.readFileSync('pnpm-workspace.yaml', 'utf8').replace(/\s*-\s*'mobile'/g, '').replace(/\s*-\s*'desktop'/g, ''); fs.writeFileSync('pnpm-workspace.yaml', ws);"

# Install dependencies for web and its shared workspace packages
RUN pnpm install --frozen-lockfile --filter=@agroloop/web...

# Build-time environment variables
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ARG APP_VERSION=1.0.7
ARG NEXT_PUBLIC_APP_VERSION=1.0.7
ARG EXPO_PUBLIC_APP_VERSION=1.0.7
ARG VITE_APP_VERSION=1.0.7
ARG GITHUB_REPO=klrab3490/AgroLoop
ARG NEXT_PUBLIC_GITHUB_REPO=klrab3490/AgroLoop
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV APP_VERSION=${APP_VERSION}
ENV NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION}
ENV EXPO_PUBLIC_APP_VERSION=${EXPO_PUBLIC_APP_VERSION}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV GITHUB_REPO=${GITHUB_REPO}
ENV NEXT_PUBLIC_GITHUB_REPO=${NEXT_PUBLIC_GITHUB_REPO}
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
