# evanbecker-client

Nuxt 3 frontend for [www.evanbecker.net](https://www.evanbecker.net).

## Tech Stack

- **Nuxt 3** — Vue 3 meta-framework with SSR/SSG, file-based routing, auto-imports
- **TypeScript** — Type-safe Vue components and composables
- **Tailwind CSS** — Utility-first styling
- **Nuxt Content** — Markdown-based blog articles with syntax highlighting
- **Auth0** — Authentication via `@auth0/auth0-spa-js` plugin
- **@nuxtjs/color-mode** — Dark/light theme toggle

## Project Structure

```
evanbecker-client/
├── pages/                  # File-based routing (index, about-me, articles, etc.)
├── components/             # Vue components (auto-imported, no prefix)
│   ├── demos/              # 3D demo components (WebGL, Three.js)
│   └── icons/              # Icon components
├── composables/            # Vue composables (useApi, useDemoTests)
├── content/articles/       # Markdown blog posts
├── layouts/                # Page layouts (default, article)
├── assets/
│   ├── css/main.css        # Global styles + print styles
│   └── images/             # Static images and logos
├── plugins/                # Nuxt plugins (auth0.client.ts)
├── server/routes/          # Server routes (feed.xml)
├── public/                 # Static public assets
├── nuxt.config.ts          # Nuxt configuration
├── tailwind.config.ts      # Tailwind configuration
├── Dockerfile              # Multi-stage production build
└── package.json
```

## Development

```bash
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

Produces `.output/` directory with Nitro server bundle.

## Docker

Multi-stage build: deps → builder → runner. Runs as non-root `nuxtjs` user on port 3000.

```bash
docker build -t evanbecker-client .
docker run -p 3000:3000 evanbecker-client
```

Build-time env vars are passed as `--build-arg`:

```bash
docker build \
  --build-arg NUXT_PUBLIC_SITE_URL=https://www.evanbecker.net \
  --build-arg NUXT_PUBLIC_API_URL=https://api.evanbecker.net \
  -t evanbecker-client .
```

## Environment Variables

All public config uses `NUXT_PUBLIC_*` prefix, accessed via `useRuntimeConfig().public` in components:

| Variable | Purpose |
|---|---|
| `NUXT_PUBLIC_SITE_URL` | Base URL of the site |
| `NUXT_PUBLIC_API_URL` | API base URL |
| `NUXT_PUBLIC_AUTH0_DOMAIN` | Auth0 tenant domain |
| `NUXT_PUBLIC_AUTH0_CLIENT_ID` | Auth0 application ID |
| `NUXT_PUBLIC_AUTH0_AUDIENCE` | Auth0 API audience |
| `NUXT_PUBLIC_AUTH0_REDIRECT_URI` | Post-login redirect URL |
