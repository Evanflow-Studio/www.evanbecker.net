---
title: 'Migrating from Next.js to Nuxt 3'
description: "After a year and a half running a Next.js 15 frontend, I replaced it with Nuxt 3 and Vue. Here's what changed, what broke, and what the migration actually looked like at the infrastructure level."
date: '2026-03-22'
tags:
  - software
  - infrastructure
---

The original evanbecker.net frontend was built with Next.js 15 and React 19. It worked fine. The MDX-powered blog rendered, Auth0 login flowed through, comments posted, and the self-hosted CI/CD pipeline deployed it without issue. So why change it?

Two reasons. First, I'd been working with Vue 3 professionally and found its composition API more natural for the kind of component-driven UI I was building. Second, Nuxt 3's built-in content module handled Markdown rendering, syntax highlighting, and file-based content management out of the box — replacing the custom MDX pipeline I'd stitched together with rehype plugins and frontmatter parsing.

This isn't a framework comparison post. Both Next.js and Nuxt are excellent. This is a walkthrough of what actually changes when you swap one for the other in a self-hosted production stack.

## What Changed

### The Application Layer

The core pages — homepage, about me, blog articles, contact form — were rewritten from React components to Vue single-file components. Nuxt's auto-import system meant dropping most explicit imports:

```vue
<!-- Nuxt auto-imports components from ~/components -->
<template>
  <div>
    <AppHeader />
    <slot />
    <AppFooter />
  </div>
</template>
```

Blog articles moved from MDX files under `src/app/articles/` to plain Markdown under `content/articles/`. Nuxt Content handles parsing, syntax highlighting (via Shiki), and provides a `queryContent()` composable for querying article metadata — no custom `lib/articles.ts` needed.

The API integration layer moved from a custom React hook (`useApi.tsx`) to a Vue composable (`useApi.ts`). The pattern is identical — wrap `fetch` with Auth0 token injection — but the reactive primitives changed from `useState`/`useEffect` to `ref`/`watch`.

### Environment Variables

Next.js uses `NEXT_PUBLIC_*` environment variables baked into the client bundle via `.env.local` files. Nuxt uses `NUXT_PUBLIC_*` variables configured through `runtimeConfig` in `nuxt.config.ts`:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:5002/',
      auth0Domain: process.env.NUXT_PUBLIC_AUTH0_DOMAIN || '',
    },
  },
})
```

Components access these via `useRuntimeConfig().public` instead of `process.env.NEXT_PUBLIC_*`.

### The Dockerfile

The Next.js Dockerfile was a simple single-stage build. The Nuxt replacement uses a multi-stage build with a non-root user:

```dockerfile
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NUXT_PUBLIC_SITE_URL
ENV NUXT_PUBLIC_SITE_URL=${NUXT_PUBLIC_SITE_URL}
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system nodejs && adduser --system nuxtjs
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output
USER nuxtjs
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

The key difference: Nuxt builds to `.output/` with a standalone Nitro server bundle (one `index.mjs` entry point), while Next.js builds to `.next/` and requires `npm start` to run.

### CI/CD Workflows

The GitHub Actions workflows changed in two ways. First, the `.env.local` creation step was removed entirely — Nuxt gets its public config through Docker build args instead of dotfiles. Second, the build context shifted from the repo root to the `evanbecker-client/` directory:

```yaml
# Before (Next.js)
- name: Create client .env.local
  run: |
    cat > ./evanbecker-client/.env.local << 'EOF'
    NEXT_PUBLIC_SITE_URL=https://www.evanbecker.net
    EOF
- name: Build
  run: docker build -f evanbecker-client/Dockerfile .

# After (Nuxt)
- name: Build
  run: |
    docker build \
      --build-arg NUXT_PUBLIC_SITE_URL=https://www.evanbecker.net \
      evanbecker-client
```

The rest of the pipeline is unchanged. The CI runner on LXC 108 builds the image, pushes it to the local registry, and Watchtower on LXC 109 picks it up within 30 seconds.

### What Didn't Change

The .NET API, PostgreSQL database, Auth0 configuration, Infisical secrets management, Traefik reverse proxy, Cloudflare Tunnel, Docker Compose production file, and Watchtower auto-deploy pipeline were all untouched. The Docker image name stayed `evanbecker-client` — from the infrastructure's perspective, it's still a Node.js container on port 3000 behind Traefik. The migration was entirely contained within the frontend build.

## The Actual Migration Process

The migration happened in a `wip` branch alongside the existing Next.js client:

1. Built the Nuxt 3 app in `evanbecker-client-v2/` while the original continued to run in production
2. Ported pages, components, and content one at a time
3. Once feature-complete, deleted `evanbecker-client/` and renamed `evanbecker-client-v2/` to `evanbecker-client/`
4. Updated all CI/CD workflows, Docker configs, and documentation
5. Ran `npm run build` to verify the Nuxt build succeeds
6. Grepped the entire repo for stale `NEXT_PUBLIC_*` and `evanbecker-client-v2` references
7. Merged to `develop` and let the existing pipeline deploy it to test

The hardest part wasn't the framework swap — it was making sure every reference across dozens of documentation files, infrastructure scripts, and CI workflows pointed at the right thing. A single stale `NEXT_PUBLIC_*` in a workflow would mean the Auth0 config doesn't get baked into the build, and login silently breaks in production.

## Lessons Learned

Running the v2 client alongside the v1 in a separate directory was the right call. It meant I could develop and test the Nuxt version without ever touching the production Next.js build. The rename-and-swap at the end was a single atomic operation.

If you're considering a similar migration: the framework-level changes are straightforward. The real work is in the infrastructure seams — environment variable naming conventions, Dockerfile build strategies, CI workflow steps, and the documentation that ties it all together.
