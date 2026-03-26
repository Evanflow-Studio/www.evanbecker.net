---
title: 'Ray Marching with Claude: Patterns for AI-Assisted Development'
description: 'How I rebuilt my Unity ray marcher from scratch in WebGL with Claude, what patterns made it work, and where it went sideways.'
date: '2026-03-25'
tags:
  - software
  - ai
  - graphics
---

Years ago, I built a ray marcher in Unity that served as the animated banner on my old website. It rendered signed distance functions — mathematical shapes defined by equations rather than polygons — directly on the GPU. When I rebuilt my portfolio site with Nuxt 3, I wanted to bring that ray marcher along. But I didn't want to just port it. I wanted to rebuild it from scratch in raw WebGL2, with no game engine, no framework, just GLSL fragment shaders and TypeScript.

I built the entire thing in collaboration with Claude. Here's what that process actually looked like — the patterns that worked, the failures we hit, and what I'd do differently.

::ray-march-embed{preset="Deep Sea" height="h-[400px]"}
::

## What Is Ray Marching?

For the uninitiated: ray marching is a rendering technique where you cast a ray from each pixel into a 3D scene and step along it until you hit something. Unlike traditional rendering (where you send triangles to the GPU), ray marching evaluates a mathematical function at each step that tells you how far away the nearest surface is. This function is called a Signed Distance Function, or SDF.

A sphere's SDF is trivially simple: the distance from any point to the sphere's surface is `length(point - center) - radius`. Boxes, tori, cylinders — each has a compact formula. The power comes from combining them: you can union two shapes by taking the minimum distance, subtract one from another, or smoothly blend them together. The Infinite Lattice scene above uses domain repetition — a single hollow cube SDF is repeated infinitely by wrapping the input coordinates with a modulo operation. One equation, infinite geometry.

## Starting Point: The Unity Ray Marcher

My original ray marcher was a Unity C# script that attached to a camera and rendered SDFs as a post-processing effect. It had a single scene with domain-repeated hollow cubes, Inigo Quilez's cosine palette for coloring, and basic lighting. The shader was maybe 80 lines of HLSL.

The new version needed to be pure WebGL2 — no Unity, no Three.js, no abstractions. Just a fullscreen quad, a fragment shader, and TypeScript to manage the GL state. I also wanted it to be dramatically more capable: multiple scenes, interactive controls, FPS camera movement, custom color palettes, post-processing effects, and embeddable in blog posts like this one.

## The Collaboration Model

I didn't hand Claude a spec and say "build this." The process was iterative and conversational, much closer to pair programming than delegation. Here are the patterns that actually worked.

### Pattern 1: Start with a Working Primitive

The first thing we built was the simplest possible ray marcher: a fullscreen quad, a fragment shader with a sphere SDF, and basic Phong lighting. No controls, no UI, no abstractions. Just a sphere on screen proving the WebGL2 pipeline worked.

This was critical. Every subsequent feature was an incremental addition to something that already worked. We never had a "big bang" moment where we tried to wire up everything at once. When the hollow cube lattice replaced the sphere, we knew the GL pipeline was solid. When we added controls, we knew the shader was solid.

### Pattern 2: Feedback Through Screenshots

Claude can't see your screen. This seems obvious, but it shapes the entire collaboration. I sent screenshots constantly — not just when something was broken, but when something looked right. When I said "this looks amazing, make this the default view," Claude had the visual context to understand what camera angle, zoom level, and palette I was referring to.

The inverse was equally important: when something looked wrong, a screenshot was worth a thousand words of description. "The geometry is clipping" with a screenshot instantly communicates what would take paragraphs to describe textually.

### Pattern 3: Name Your Presets, Don't Describe Them

Early on, I saw a particular configuration — Forest palette, Pulse animation, specific spacing — and said "save this as Jellyfish." That single name became a shared reference point for the rest of the project. Instead of saying "use palette 10 with animation 3 and cellSpacing 0.15," I could say "make Jellyfish the default" and Claude knew exactly what I meant.

We ended up with seven named presets (Deep Sea, Jellyfish, Crystal Array, Neon Grid, Vortex, Shattered Ice, Dreamscape), each serving as a stable reference point that both of us understood.

### Pattern 4: Let the AI Propose, You Dispose

When I asked "what changes would you suggest to make this cooler?", Claude proposed audio reactivity, post-processing, shareable URLs, time controls, scripting, and more. I didn't accept everything — I killed the audio system later because it was buggy and didn't add enough value. But having a menu of options to choose from was vastly more productive than coming up with every feature myself.

The key: I always made the final call. Claude proposed, I decided. When I said "get rid of all the audio stuff," it was gone. No pushback, no sunk cost fallacy.

### Pattern 5: Refactor in Waves, Not Continuously

We didn't write clean code from the start. The first version of `useRayMarchGL.ts` was a 900-line monolith with 30 refs passed as function arguments. It worked, but it was unmaintainable.

Rather than refactoring incrementally (which would have slowed feature development), I let it grow until it became painful, then dedicated an entire session to architecture. We introduced Pinia for state management, split the monolith into seven focused composables, extracted types into their own file, and eliminated all prop drilling. The 900-line file became seven files, none over 190 lines.

This mirrors how I'd work with a human teammate: ship the feature, then clean up.

## Where It Went Wrong

This wasn't all smooth sailing. Here are the real failures.

### The Shader Compilation Crisis

The worst bug we hit: the ray marcher took **123 seconds** to load. Not a typo. Two full minutes of a frozen browser tab.

The root cause was GPU shader compilation. Every time we added a new geometry preset or animation, the GPU compiler had to analyze exponentially more branch paths. With 10 geometries and 7 animations inside a 128-iteration ray march loop, plus shadow and ambient occlusion secondary marches, the total branch analysis exploded.

Claude's first instinct was to reduce the loop count. That helped marginally. Then it tried async shader compilation with `KHR_parallel_shader_compile`. That helped on Chrome but Firefox doesn't support it. Then it tried clamping, deferring, polling — each "fix" either broke something else or only worked on one browser.

The actual fix required understanding the problem at a deeper level: we removed the expensive secondary ray marches (shadows, AO), reduced the geometry to compile-time essentials, and implemented a two-shader strategy where a minimal placeholder shader loads instantly while the full shader compiles in the background.

The lesson: Claude is excellent at implementing solutions but sometimes needs human guidance to correctly diagnose the root cause. I had to push back multiple times with "you're in a loop, something fundamental changed" before we found the real issue.

### The Audio System

We built a generative audio system with Web Audio API — procedural ambient drones that changed per scene, microphone input for audio reactivity, and FFT-driven geometry. It was technically impressive and worked in isolation.

In practice, it was buggy across browsers, the drone got monotonous, source switching had race conditions, and the FFT bands didn't drive the geometry in a visually meaningful way. I killed the entire system. Sometimes the best feature is the one you remove.

### Firefox vs Chrome

Every WebGL feature behaves differently between Firefox and Chrome. `KHR_parallel_shader_compile` only exists in Chrome. Firefox blocks on `getProgramParameter(LINK_STATUS)`. `gl.linkProgram` is synchronous on some Firefox/Mesa combinations but async on Chrome. Touch events have different timing. The `#app-manifest` Nuxt error only appeared in certain cache states.

Claude couldn't test across browsers — it could only reason about differences. I had to be the cross-browser test harness, reporting behavior from both browsers and letting Claude adjust.

## The Architecture That Emerged

After multiple refactoring passes, here's where the codebase landed:

**Pinia Store** owns all state — scene configuration, camera position, lattice parameters, render quality, time controls. Any component can read or write state without prop drilling.

**Seven focused composables** under `composables/raymarcher/`, each under 190 lines:
- `useShaderCompiler` — GL context, two-shader compile strategy
- `useInputHandler` — mouse/keyboard/touch with strategy pattern for key actions
- `useCameraController` — FPS movement, orbit, drift
- `useRenderPipeline` — uniform uploads, FBO management, post-processing
- `useScreenshot` — high-res PNG export
- `useCustomScripting` — sandboxed JS expression evaluation
- `useRayMarchEngine` — thin orchestrator wiring everything together

**Auto-fork presets** — selecting a preset locks the UI. Tweaking any control auto-forks to "Custom (preset name)" with a reset button. This is a copy-on-write pattern borrowed from game engine material instances.

**URL import/export** — the Share button serializes all state to a URL hash. Loading that URL hydrates the store, then clears the hash. One-shot import, not live sync.

## What I'd Tell Someone Starting This

1. **Start with the smallest working thing.** A sphere on screen. Then iterate.
2. **Send screenshots constantly.** Visual context is the most efficient way to communicate with an AI about visual output.
3. **Name things early.** Shared vocabulary compounds over the life of a project.
4. **Let features grow messy, then refactor in dedicated passes.** Don't optimize prematurely.
5. **Be willing to kill features.** Audio reactivity sounded amazing on paper but wasn't worth the bugs.
6. **You're the cross-browser tester.** The AI can reason about browser differences but can't experience them.
7. **Push back when the AI is looping.** If three fixes don't work, the diagnosis is probably wrong. Say so.

The ray marcher started as an 80-line Unity shader and became a 2,000+ line WebGL2 application with a Pinia store, seven composables, embeddable blog components, and shareable URLs. The journey wasn't linear, but the patterns above are what made it tractable.

::sandbox-link{to="/sandbox/raymarcher" label="Try the Ray Marcher" description="Interactive WebGL2 ray marcher — WASD to move, mouse to look"}
::
