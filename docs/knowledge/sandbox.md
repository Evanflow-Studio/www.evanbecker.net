---
id: ebn.sandbox
kind: goal
title: The sandbox shows what the site can render
summary: The ray marcher's scenes and controls, and the homelab demo.
parent: ebn
product: www.evanbecker.net
check: rollup
owner: Evan
status: draft
read: public
links: [ebn.articles]
---

`/sandbox`, the WebGL2 ray marcher (`/sandbox/raymarcher`) and the homelab demo (`/sandbox/homelab`).

| Key | Kind | Statement | Check |
|---|---|---|---|
| `ebn.sandbox.index` | behaviour | `/sandbox` links the ray marcher and the homelab demo | none |
| `ebn.sandbox.scenes` | behaviour | The ray marcher renders four scenes in WebGL2: Infinite Lattice, Mandelbulb, CSG Gallery and Fractal Descent | none |
| `ebn.sandbox.controls` | behaviour | The ray marcher offers cosine palettes, post-processing (bloom, chromatic aberration) and a free-flying camera driven by keyboard, mouse or touch | none |
| `ebn.sandbox.share` | behaviour | A ray-marcher scene and its settings can be shared as a URL that opens the same view | none |
| `ebn.sandbox.screenshot` | behaviour | The ray marcher saves a PNG screenshot at twice the canvas resolution | none |
| `ebn.sandbox.clean-load` | ility | `/sandbox/raymarcher` loads and renders with no console errors | none |
| `ebn.sandbox.no-audio` | decision | The ray marcher has no audio visualizer, YouTube search or jam sessions; they were removed (Evan, 11-16) and the renderer kept | none |
| `ebn.sandbox.homelab-status` | behaviour | The homelab demo shows each service's live status from Uptime Kuma's public status page, through the site's `/api/health` route | none |
