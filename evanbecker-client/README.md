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
WebGL2 GPU ray marcher with 4 scenes, 10 geometry presets, 9 animation modes, FPS camera, 12+ color palettes, post-processing, FOV zoom, and GLSL/JS scripting. Includes an audio-reactive visualization engine (YouTube + tab audio capture → Meyda/Essentia → real-time fractal parameter mapping) and multiplayer jam sessions via SignalR.

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

Opens at [http://localhost:3000](http://localhost:3000). The API should also be running at `localhost:5002` for comments, auth, and Spotify features to work. See the [API README](../evanbecker-api/README.md) for setup.

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
