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
├── pages/                       # File-based routing
├── components/
│   ├── demos/                   # Interactive demo components
│   │   ├── RayMarchDemo.vue     # WebGL2 ray marcher orchestrator
│   │   ├── HomelabDemo.vue      # 3D homelab topology viewer
│   │   ├── ArchGraphDemo.vue    # 3D architecture knowledge graph
│   │   └── raymarcher/          # Ray marcher sub-components
│   │       ├── RayMarchControls.vue
│   │       ├── ScriptEditor.vue
│   │       └── tabs/            # Control panel tabs (Scene, Color, FX, Tools)
│   ├── ui/                      # Reusable UI components
│   │   ├── FloatingPanel.vue    # Draggable/collapsible panel
│   │   └── TabBar.vue           # Generic tab bar
│   └── icons/                   # Icon components
├── composables/
│   ├── useRayMarchGL.ts         # WebGL2 render engine
│   ├── useCommandDispatcher.ts  # Command pattern for demo controls
│   ├── useUptimeKuma.ts         # Live status from Uptime Kuma
│   └── useUrlState.ts           # URL hash state serialization
├── utils/shaders/               # GLSL shader modules
│   ├── constants.ts             # Shared enums and config
│   ├── lattice-presets.ts       # Named scene presets
│   ├── raymarcher.frag.ts       # Fragment shader builder
│   └── fragments/               # GLSL module fragments
├── content/articles/            # Markdown blog posts
├── layouts/                     # Page layouts (default, article)
├── assets/                      # CSS, images, fonts
├── plugins/                     # Nuxt plugins (auth0.client.ts)
├── server/routes/               # Server routes (feed.xml)
├── nuxt.config.ts               # Nuxt configuration
├── Dockerfile                   # Multi-stage production build
└── package.json
```

## Interactive Demos (`/sandbox`)

### Ray Marcher
WebGL2 GPU ray marcher with 4 scenes, 10 geometry presets, 9 animation modes, FPS camera, 12+ color palettes, post-processing, FOV zoom, and GLSL/JS scripting.

See [`composables/raymarcher/README.md`](composables/raymarcher/README.md) for full architecture docs.

### Homelab Viewer
3D topology of the Proxmox homelab with live status from Uptime Kuma — sonar ping animations show green for up, red (larger) for down.

### Architecture Graph
3D force-directed knowledge graph of architecture patterns and technologies.

## Development

```bash
# From repo root — start just the database
docker compose up -d

# Then run the frontend
cd evanbecker-client
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000). The API should also be running at `localhost:5002` for sign-in, the account page, and Spotify features to work. See the [API README](../evanbecker-api/README.md) for setup.

For Auth0 login to work locally, create `evanbecker-client/.env`:
```
NUXT_PUBLIC_AUTH0_DOMAIN=dev-m3uiopcp.us.auth0.com
NUXT_PUBLIC_AUTH0_CLIENT_ID=2evqEjBNUmBVt6fNwcGkicfjNNrYsjV0
NUXT_PUBLIC_AUTH0_AUDIENCE=evanbecker.api
```
This file is gitignored.

## Build

```bash
npm run build
```

Produces `.output/` directory with Nitro server bundle.

## Docker

Multi-stage build: deps → builder → runner. Runs as non-root `nuxtjs` user on port 3000.

**One image serves every environment.** Nothing environment-specific is baked in at build time: the site URL, API URL, Auth0 settings, reCAPTCHA site key and the indexable flag are read when the server starts, from `NUXT_PUBLIC_*` env vars. The only build arg is `NUXT_PUBLIC_APP_VERSION`, which names the build. Each environment's values are in `env/test.env` and `env/prod.env`; they're all public (they're served in every page's payload), so secrets never go there.

```bash
docker build --build-arg NUXT_PUBLIC_APP_VERSION=dev -t evanbecker-client .
docker run -p 3000:3000 --env-file env/test.env evanbecker-client   # serves as test.evanbecker.net
docker run -p 3000:3000 --env-file env/prod.env evanbecker-client   # serves as www.evanbecker.net
```

Every API call goes through `useApiBase()` and `apiRequestDefaults` (`utils/apiBase.ts`), which send `credentials: 'include'`: on test the API sits behind Cloudflare Access, which refuses a cross-origin call without its cookie. A unit test fails if a call site skips them.

Without the env vars the image serves local-dev defaults and is **not** indexable, so a misconfigured deploy never gets indexed. `scripts/smoke-client-image.sh <image>` runs an image with each env file and checks that every page, `robots.txt`, `sitemap.xml` and `feed.xml` uses that environment's own site URL; the PR checks run it.

## Environment Variables

All public config uses `NUXT_PUBLIC_*` prefix, accessed via `useRuntimeConfig().public` in components. Each one overrides the matching `runtimeConfig.public` key in `nuxt.config.ts` at runtime, in `npm run dev` and in the built server alike:

| Variable | Purpose |
|---|---|
| `NUXT_PUBLIC_SITE_URL` | Base URL of the site: canonical links, Open Graph, `robots.txt`, `sitemap.xml`, `feed.xml` |
| `NUXT_PUBLIC_INDEXABLE` | `true` only in prod. Anything else serves `noindex` and a `Disallow: /` robots.txt |
| `NUXT_PUBLIC_API_URL` | API base URL, as the browser reaches it |
| `NUXT_API_BASE_SERVER` | Server-only, optional: the API's address on the host's own network (`http://ebn-tst-api`), for calls made while rendering on the server, so they don't go out through Cloudflare Access. Never sent to the browser |
| `NUXT_PUBLIC_AUTH0_DOMAIN` | Auth0 tenant domain |
| `NUXT_PUBLIC_AUTH0_CLIENT_ID` | Auth0 application ID |
| `NUXT_PUBLIC_AUTH0_AUDIENCE` | Auth0 API audience |
| `NUXT_PUBLIC_AUTH0_REDIRECT_URI` | Post-login redirect URL |
| `NUXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA site key (public) |
| `NUXT_PUBLIC_APP_VERSION` | Build version shown in the footer; set at build time |
