---
title: 'Math Pretending to Be Architecture'
description: 'How I rebuilt my Unity ray marcher from scratch in WebGL2 with Claude — the patterns that worked, the ones that didn't, and what fell out of a week of collaboration.'
date: '2026-03-25'
tags:
  - software
  - ai
  - graphics
---

There's a rendering technique where instead of building 3D shapes out of polygons, you describe them purely as math. You want a sphere? Write a function that returns the distance from any point to its surface. That single equation, evaluated everywhere in space, *is* the sphere. The GPU doesn't model it, doesn't triangulate it, doesn't even store it. It just fires a ray from each pixel, steps forward calling your function at each step, and when the distance gets small enough, it lights the pixel. Echolocation for geometry.

The functions are called signed distance functions. The stepping algorithm is ray marching. And the things you can do by combining them get interesting fast. Subtract one shape from another and you get carving: a sphere carved from a cube produces a hollow cube. Apply a modulo to the input coordinates and one hollow cube tiles infinitely through space, stretching in every direction. Blend two shapes together and they melt into each other like wax. You can see some of these operations running live in the [CSG Operations scene](/sandbox/raymarcher?s=2). It's math pretending to be architecture, and the GPU recalculates the entire scene from scratch sixty times a second.

My old website (rest in peace, evanbecker.com) had a modest one of these running as a Unity banner at the top of the page. It did one thing well: infinite hollow cubes, smooth color gradients. When I rebuilt the site this year, I kept looking at the empty space where it used to be. I wanted it back, but I also wanted to find out what would happen if I rebuilt it from scratch in raw WebGL2 with Claude, without Unity handling the hard parts. What happened was a week of collaboration that taught me as much about working with an AI as it did about shader programming.

::ray-march-embed{preset="Deep Sea" height="h-[400px]"}
::

## The Original

The Unity version lived as a C# script attached to a camera. The shader was HLSL, rendered as a post-processing effect. Domain-repeated hollow cubes, Inigo Quilez cosine palettes for color, basic lighting. It worked well for what it was. But Unity is a game engine, and a game engine is doing a *lot* of work behind the scenes to get a fragment shader onto your screen: managing the GL context, the render loop, the camera, the input system, the windowing. All of which evaporates the moment you decide to render the same thing in a browser with nothing but WebGL2 and TypeScript.

That gap between "write a shader" and "get a shader onto a webpage" is where most of the work went. The actual SDF math barely changed from the Unity version. Everything around it had to be built from zero.

## How It Actually Went

I didn't write a spec. There was no design document or architecture diagram. The process was closer to pair programming than delegation: I described what I wanted, Claude wrote code, I told it what worked and what didn't, we iterated. Some sessions were productive. Some produced code that had to be thrown out entirely. The patterns that emerged are the interesting part.

### Start with a sphere

The first thing we built was the dumbest possible ray marcher. A fullscreen quad. A fragment shader with a sphere SDF. Phong lighting. No controls, no UI, no architecture. Just a sphere on screen proving the WebGL2 pipeline worked end to end.

This turned out to be the most important decision of the project. Every feature after that was an incremental addition to something that already rendered. When the hollow cube lattice replaced the sphere, the GL pipeline was already proven. When we added controls, the shader was already proven. There was never a moment where we wired up five systems at once and couldn't figure out which one was broken.

### Screenshots are the protocol

Claude can't see your screen. This shapes the entire collaboration more than you'd expect. I sent screenshots constantly — not just when things broke, but when things looked *right*. When I said "this looks incredible, make this the default view," Claude had the exact visual context to understand which camera angle, zoom, and palette I meant.

The inverse was even more valuable. "The geometry is clipping" with a screenshot communicates in one image what would take three paragraphs of text. And because SDFs produce visual artifacts that are hard to describe ("there's a green tint in the void" or "the cells are bleeding through each other"), screenshots became the primary communication channel for any rendering issue.

### Name things early

At some point I saw a configuration I liked — Forest palette, Pulse animation, specific spacing values — and said "save this as Jellyfish." That single name became a shared reference for the rest of the project. Instead of reciting six parameter values, I could say "make Jellyfish the default" and Claude knew exactly what I meant.

We ended up with seven named presets: Deep Sea, Jellyfish, Crystal Array, Neon Grid, Vortex, Shattered Ice, Dreamscape. Each one a stable landmark that both of us could point to. Naming things turns configuration into vocabulary, and vocabulary compounds over time.

### Let the AI propose

When I asked "what would make this cooler?", Claude proposed audio reactivity, post-processing, shareable URLs, time controls, a scripting system, and more. I didn't accept everything. But having a menu of options to choose from was more productive than generating every idea myself.

The important part: I always made the call. Claude proposed. I decided. When I said "get rid of all the audio stuff," it was gone within minutes. No sunk cost, no pushback. This dynamic — AI as proposal engine, human as decision maker — worked well throughout.

### Refactor in waves

We didn't write clean code from the start. The first version of the main composable was a 900-line file with thirty refs passed as function arguments. It worked. It was also the kind of code that makes you close your editor and take a walk.

Rather than refactoring continuously (which slows feature development to a crawl), I let it grow until it became genuinely painful, then dedicated a full session to architecture. We introduced Pinia for state management, split the monolith into focused composables, extracted types, eliminated prop drilling. The 900-line file became seven files, none over 190 lines.

This mirrors how I work with human teammates too: ship the feature, then clean the kitchen.

## Where It Went Wrong

Not everything worked. Some of the failures were instructive. Some were just expensive.

### The compilation crisis

The worst bug: the ray marcher took 123 seconds to load a page. Two full minutes of a frozen browser tab.

The root cause was GPU shader compilation. Every geometry preset and animation we added gave the GPU compiler exponentially more branch paths to analyze. With ten geometries and seven animations inside a 128-step ray march loop, the compiler's job was enormous.

Claude's instinct was to reduce the loop count. That barely helped. Then it tried async shader compilation. That worked on Chrome but not Firefox. Then it tried clamping distances. Then deferred validation. Then polling. Each fix either broke something or only worked on one browser.

I eventually had to say: "You're in a loop. Something fundamental changed." That reframing led to the actual fix: we removed the expensive secondary ray marches (soft shadows, ambient occlusion), reduced compile-time branching, and implemented a two-shader strategy where a minimal placeholder loads instantly while the real shader compiles in the background.

The lesson here wasn't about shaders. It was about when to tell an AI "your diagnosis is wrong" instead of letting it keep iterating on the wrong solution. Claude is excellent at implementing fixes. But it can sometimes cycle through surface-level solutions when the real problem requires stepping back and rethinking the approach entirely.

### The audio system

We built a generative audio system. Procedural ambient drones using Web Audio API oscillators, with different chord progressions per scene. Microphone input for audio-reactive geometry. FFT bands driving cell spacing and thickness. It was technically solid.

In practice, it was buggy across browsers. The drone lacked variety. Source switching had race conditions. The FFT analysis didn't map to the geometry in a way that felt meaningful. I killed the entire system after three days.

Sometimes the right feature is the one you remove.

### Cross-browser reality

Every WebGL behavior differs between Firefox and Chrome. `KHR_parallel_shader_compile` only exists in Chrome. Firefox blocks on shader status checks. Touch events have different timing. The same shader compiles in 200ms on Chrome and three seconds on Firefox.

Claude couldn't test either browser — it could only reason about the differences from documentation and my reports. I became the cross-browser test harness, running the same action on both browsers and describing what happened. This worked, but it was slow, and some bugs took multiple round-trips to isolate.

## The Architecture

After several refactoring passes, here's roughly where things landed.

A **Pinia store** owns all state: scene configuration, camera position, lattice parameters, render quality, time controls. Components read and write state directly without prop drilling. The store also handles URL import/export — the share button serializes everything to a URL hash, and loading that URL hydrates the store on arrival.

Seven **focused composables** each handle one concern: shader compilation, input handling, camera movement, the render pipeline, screenshots, custom scripting, and a thin orchestrator that wires them together. None exceeds 190 lines.

An **auto-fork preset system** locks the UI when a named preset is selected. The moment you tweak any control, it forks to "Custom (from Deep Sea)" with a reset button. This is essentially copy-on-write for configuration — borrowed from how game engines handle material instances.

The **two-shader compile strategy** loads a minimal placeholder (48 steps, one geometry, no branching) that compiles in under 100ms, then swaps in the full shader once the GPU finishes. Chrome uses `KHR_parallel_shader_compile` for non-blocking compilation. Firefox falls back to a deferred swap.

## What Held Up

If I distilled this down to the patterns worth keeping:

**Start with the smallest working thing.** Not the smallest *useful* thing. The smallest thing that proves the pipeline works. A sphere rendering on a WebGL2 canvas. Then build on it.

**Visual feedback is the communication layer.** With graphics work especially, screenshots beat description by an enormous margin. Send them proactively, not just when debugging.

**Name your configurations.** "Jellyfish" is worth more than six parameter values. Shared vocabulary reduces friction in every subsequent conversation.

**Let the AI generate options, but make decisions yourself.** The proposal-decision split keeps the collaboration productive without surrendering judgment.

**Refactor in dedicated passes.** Ship first, clean second. Trying to maintain perfect architecture while exploring features leads to neither.

**Know when to override the diagnosis.** If three fixes haven't worked, the problem probably isn't what either of you thinks it is. Say so. Step back. Rethink.

The ray marcher started as a Unity shader and became something considerably larger. The collaboration wasn't linear — it looped, backtracked, produced features that got deleted. But the patterns above are what kept the loops productive rather than frustrating.

::ray-march-embed{preset="Jellyfish" height="h-[400px]"}
::

::sandbox-link{to="/sandbox/raymarcher" label="Try the Ray Marcher" description="Interactive WebGL2 ray marcher — WASD to move, mouse to look"}
::
