FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (public only — baked into the client bundle)
ARG NUXT_PUBLIC_SITE_URL
ARG NUXT_PUBLIC_API_URL
ARG NUXT_PUBLIC_AUTH0_DOMAIN
ARG NUXT_PUBLIC_AUTH0_CLIENT_ID
ARG NUXT_PUBLIC_AUTH0_AUDIENCE
ARG NUXT_PUBLIC_AUTH0_REDIRECT_URI
ARG NUXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NUXT_PUBLIC_APP_VERSION=dev

ENV NUXT_PUBLIC_SITE_URL=${NUXT_PUBLIC_SITE_URL}
ENV NUXT_PUBLIC_API_URL=${NUXT_PUBLIC_API_URL}
ENV NUXT_PUBLIC_AUTH0_DOMAIN=${NUXT_PUBLIC_AUTH0_DOMAIN}
ENV NUXT_PUBLIC_AUTH0_CLIENT_ID=${NUXT_PUBLIC_AUTH0_CLIENT_ID}
ENV NUXT_PUBLIC_AUTH0_AUDIENCE=${NUXT_PUBLIC_AUTH0_AUDIENCE}
ENV NUXT_PUBLIC_AUTH0_REDIRECT_URI=${NUXT_PUBLIC_AUTH0_REDIRECT_URI}
ENV NUXT_PUBLIC_RECAPTCHA_SITE_KEY=${NUXT_PUBLIC_RECAPTCHA_SITE_KEY}
ENV NUXT_PUBLIC_APP_VERSION=${NUXT_PUBLIC_APP_VERSION}

RUN npm run build

# Production image — run with minimal footprint
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxtjs

# Copy the Nuxt output
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output

USER nuxtjs

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
