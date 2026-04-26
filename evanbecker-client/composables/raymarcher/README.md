# Ray Marcher — Audio-Reactive Fractal Visualizer

A real-time ray marching renderer with audio-reactive visualization, YouTube-powered jam sessions, and multiplayer sync via SignalR.

## Architecture

```
composables/raymarcher/
├── useRayMarchEngine.ts          # WebGL render loop, shader compilation, context management
├── useShaderCompiler.ts          # GLSL compilation + error handling
├── useRenderPipeline.ts          # Uniform upload, post-processing (bloom, chromatic aberration)
├── useInputHandler.ts            # Keyboard/mouse/touch input for camera control
├── useMeydaAnalyzer.ts           # Real-time audio feature extraction (Meyda.js)
├── useEssentiaClassifier.ts      # Genre/mood classification via Essentia.js WASM
├── useAudioCapture.ts            # File-based audio loading + analysis
├── useAudioReactiveMode.ts       # Legacy autoplayer (preset-based scene cycling)
│
└── audio/
    ├── useTabAudioCapture.ts     # Browser tab audio capture via getDisplayMedia
    ├── useYouTubePlayer.ts       # YouTube IFrame API wrapper
    ├── useYouTubeSearch.ts       # YouTube Data API search (proxied through .NET API)
    ├── usePlaybackQueue.ts       # Track queue with shuffle/repeat
    ├── useTrackMetadata.ts       # MusicBrainz genre lookup + YouTube title parsing
    ├── useMusicBrainzLookup.ts   # MusicBrainz API client (recording + artist tag resolution)
    ├── useVisualizationEngine.ts # Continuous audio→visual parameter mapping
    └── useSessionHub.ts          # SignalR multiplayer session management
```

## Audio Pipeline

```
Audio Source (YouTube / File / Tab Capture)
    │
    ▼
AnalyserNode (Web Audio API)
    │
    ├── getByteFrequencyData()  → FFT spectrum (128-1024 bins)
    ├── getByteTimeDomainData() → Waveform for beat detection
    │
    ▼
Meyda Feature Extraction
    │
    ├── RMS energy, spectral centroid, spectral flatness
    ├── MFCC coefficients, chroma, ZCR
    │
    ▼
Visualization Engine
    │
    ├── Scene selection (weighted by energy/spectral character)
    ├── Palette generation (genre-seeded cosine gradients)
    ├── Geometry parameters (cell spacing, wall thickness, animations)
    ├── Camera drift (Lissajous orbits, genre-influenced speed/radius)
    └── Post-FX (bloom, chromatic aberration, fog density)
```

## Jam Sessions (SignalR)

Authenticated users can create shared sessions where multiple people watch the same visualizer synced to the same music.

**Flow:**
1. Host creates a room → gets a 6-character code (e.g., `A3X9K2`)
2. Others join via the code
3. Members enable tab audio capture and click "Ready"
4. Ready state: gray (not ready) → yellow (ready, no viz) → green (ready + visualizer)
5. Host can only start playback when all members are green
6. Playback sync is event-driven: host play/pause/seek/skip → broadcast → clients sync
7. Background poll every 10s catches major drift only

**Hub:** `SessionHub.cs` on the API (`/hubs/session`)
**Manager:** `SessionManager.cs` — in-memory `ConcurrentDictionary`, no database
**Cleanup:** `SessionCleanupService.cs` — 15s sweep, 30min inactivity timeout

## API URL Convention

Always strip trailing slash and prefix with `/`:

```typescript
const apiUrl = (config.public.apiUrl as string).replace(/\/$/, '')
await $fetch(`${apiUrl}/api/v1/endpoint`, { ... })
```

## Secrets

| Secret | Where | Purpose |
|--------|-------|---------|
| `YOUTUBE_API_KEY` | Infisical → `YouTube:ApiKey` | YouTube Data API v3 search |
| Auth0 JWT | Browser → query param on WebSocket | Session hub authentication |

No additional secrets needed for SignalR — it runs on the same API server.

## Scenes

| Index | Name | Description |
|-------|------|-------------|
| 0 | Infinite Lattice | Domain-repetition hollow cubes with CSG cutouts |
| 1 | Mandelbulb | Power-8 Mandelbulb fractal with orbit trap coloring |
| 2 | CSG Gallery | Constructive solid geometry (union/intersection/difference) |
| 3 | Fractal Descent | Menger sponge with animated scale/rotation |

## Key Dependencies

- **three.js** — Not used for rendering (pure WebGL), but available for future 3D UI
- **meyda** — Real-time audio feature extraction
- **essentia.js** — WASM-based audio classification
- **@microsoft/signalr** — Real-time multiplayer sessions
