# Ray Marcher — WebGL2 Fractal Renderer

A real-time ray marching renderer in pure WebGL2, with four scenes, cosine palettes, post-processing and a
free-flying camera. State lives in the Pinia store `stores/raymarcher.ts`, and a scene can be shared as a URL.

## Architecture

```
composables/raymarcher/
├── useRayMarchEngine.ts          # WebGL render loop, shader compilation, context management
├── useShaderCompiler.ts          # GLSL compilation + error handling
├── useRenderPipeline.ts          # Uniform upload, post-processing (bloom, chromatic aberration)
├── useInputHandler.ts            # Keyboard/mouse/touch input for camera control
├── useCameraController.ts        # Camera forward/right vectors and movement
└── useScreenshot.ts              # 2x-resolution PNG capture

utils/shaders/                    # GLSL sources: full and fast fragment shaders, post-FX, presets
components/demos/RayMarchDemo.vue # Canvas, HUD and controls (components/demos/raymarcher/)
```

The audio-reactive visualizer, its YouTube search and the multiplayer jam sessions were removed in
November 2026. The renderer is unchanged: the scenes look the same without audio input.

## Scenes

| Index | Name | Description |
|-------|------|-------------|
| 0 | Infinite Lattice | Domain-repetition hollow cubes with CSG cutouts |
| 1 | Mandelbulb | Power-8 Mandelbulb fractal with orbit trap coloring |
| 2 | CSG Gallery | Constructive solid geometry (union/intersection/difference) |
| 3 | Fractal Descent | Menger sponge with animated scale/rotation |

## Dependencies

None at runtime beyond Vue and Pinia: rendering is pure WebGL2.
