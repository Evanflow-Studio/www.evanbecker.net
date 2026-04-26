---
title: 'Math Pretending to Be Architecture'
description: 'Signed distance functions, ray marching, and rebuilding my old Unity shader as something I can actually maintain. The math that hooked me, and where it points next.'
date: '2026-03-25'
tags:
  - software
  - ai
  - graphics
---

There's a way to describe a 3D shape that doesn't involve a single triangle. You don't list vertices, you don't define edges, you don't model a mesh. You write a function. Pass any point in space into it, and it returns the distance from that point to the nearest surface. If the point is inside the shape, the distance is negative.

That's it. The function *is* the shape.

A signed distance function for a sphere centered at the origin, radius `r`:

```glsl
float sphere(vec3 p) {
  return length(p) - r;
}
```

Three lines. No mesh. No triangulation. No storage of geometric data anywhere except inside the math itself. To render this, you fire a ray from each pixel into the scene and step forward, calling the SDF at each step. When the distance gets very small, you've hit the surface and you light the pixel. The trick is that the SDF tells you *exactly how far you can step* before there's any chance of hitting something. Instead of marching one tiny increment at a time, you sphere-trace: take the distance the function gave you and jump that whole way at once. Geometry by echolocation.

This rendering technique is called ray marching. The functions are called signed distance functions, or SDFs. And the things you can do by combining them get interesting fast.

::ray-march-embed{preset="Deep Sea" height="h-[400px]"}
::

My old website had a small ray marcher running as a Unity-rendered banner at the top of every page. When I rebuilt the site this year, I wanted it back. So I rebuilt it. Three months later, the rebuild has its own questions, the old answers don't quite fit, and I've ended up several layers deeper than where I started.

This is mostly about the math. Some about the rebuild. And a little about where the math wants to go.

## What an SDF Actually Is

The sphere case makes the idea look almost trivial. A function from a point in space to a scalar distance. The implications get sharp once you start composing.

A box is just slightly more involved:

```glsl
float box(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}
```

A torus, a cylinder, a cone, a triangular prism, a hexagonal prism, each one is a few lines of math. There's a whole library of them, codified by [Inigo Quilez](https://iquilezles.org/articles/distfunctions/), who has done more than anyone alive to popularize the technique.

What makes SDFs powerful is that all of these primitives compose with each other through the simplest possible operators.

```glsl
float opUnion(float a, float b)        { return min(a, b); }
float opIntersection(float a, float b) { return max(a, b); }
float opSubtraction(float a, float b)  { return max(a, -b); }
```

`min` is union. `max` is intersection. `max` of the first against the negative of the second is subtraction. That's the entire boolean algebra of solids, expressed in three operators applied to scalar distances. There's no mesh CSG, no algorithm to compute the intersection of two polygon meshes, no degenerate triangles, no broken topology. The math just composes. You can see this running live in the :scene-link{:scene="2" :palette="4" label="CSG Operations scene"}.

The killer feature is that these compositions can be made *smooth*. The hard `min` of two SDFs gives you a sharp seam where the surfaces meet. There's also a polynomial smooth-minimum that interpolates between them based on a smoothness factor `k`:

```glsl
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
```

Two spheres unioned with `smin` melt into each other. The transition is exact, parametric, mathematically smooth, and it costs you a single extra `clamp` and a `mix`. Try doing that with triangles.

## Domain Tricks

The other lever you get with SDFs is on the *input*. Before you evaluate the SDF, you transform the point.

```glsl
vec3 p = mod(originalP + 0.5 * cellSize, cellSize) - 0.5 * cellSize;
```

That single line tiles the entire scene infinitely. The SDF evaluates as if there's one shape, but `mod` says "treat all of space as if it's the same cell, repeating." A single sphere becomes a lattice of spheres extending to the horizon in every direction. Mirror operations, twists, bends, displacements, all of them are point transformations applied before the SDF gets called. The function never knows it was deceived.

This is where ray marching stops being "a way to draw spheres" and becomes a way to think about geometry. You can describe shapes that would be impossible to mesh: infinite tilings, fractal structures, twisted columns, surfaces displaced by procedural noise. The Sierpinski tetrahedron in the [Unity version](https://github.com/evanjbecker/Raymarch) is recursive: a function that calls itself a fixed number of times, applying scale and folding operations until each layer subdivides into the next.

The big realization, the one that took a while to land: SDFs are a *language for describing geometry*. The fact that you can render them is downstream of the fact that the math itself is exact. There are no approximations until the very end, when you sample the field. The shape exists with infinite precision until the moment you look at it.

## The Port

The Unity original was a few hundred lines of HLSL and C#. Soft shadows, ambient occlusion, smooth booleans, a fly camera, two scenes. The math was solid and the visuals were good. None of it was particularly portable, and the C# script wrapping it had grown into the kind of glue code that only worked because Unity was holding everything in place around it.

Unity does an enormous amount of infrastructure work that you stop noticing until it's gone: the GL context, the render loop, the camera matrix, input handling, depth integration, the windowing system. The moment you decide to render the same shader in a browser with raw WebGL2 and TypeScript, that whole stack disappears. The shader was a few hundred lines. Getting it onto a webpage was almost everything else.

I worked on this with Claude. The framing matters. The math was already mine, brought from years of writing this kind of shader in Unity. The compositions, the visual choices, the palette and animation system, the SDF library itself, all of it was logic I'd already proven out and was carrying across. The work I needed help with was the boilerplate of the new platform. WebGL2 context setup. Pinia store wiring. The composable architecture that replaced Unity's component model. The build system. The cross-browser shader compilation strategy.

The honest description: I had a working system in one runtime, I wanted the same logic in a different runtime, and I had a typing partner who was very fast at TypeScript and could pattern-match on framework conventions I hadn't memorized. Architecture decisions like Pinia for state, focused composables instead of one mega-file, a two-shader strategy for compile-time UX, named-preset auto-fork: those came out of conversations where I had strong opinions about what good code looked like and Claude was useful for typing them out. Some of those conversations ended with code thrown out. Some ended with me explicitly overriding what Claude was suggesting.

The bigger value of the rebuild wasn't speed. It was that the original was built as a Unity script, and a Unity script lives or dies with the editor. Pulling the math out of that environment forced it to stand on its own. The shader is now a string in a TypeScript module, the scene state lives in a Pinia store, parameters round-trip through the URL, and every piece of geometry behavior has a place to live that isn't a `MonoBehaviour`. That's the kind of code I can actually maintain a year from now.

The most expensive bug along the way was a 123-second compile time. Claude's first three diagnoses were all surface-level: reduce loop count, async compilation, deferred validation. Each fix either broke something or only worked on one browser. The actual cause was that the Unity-style soft shadows and ambient occlusion required secondary ray marches inside the main loop, and the cross product of geometry presets, animations, and secondary marches was making the shader compiler do exponentially more work. The fix was architectural: strip the secondary marches, ship a minimal shader that compiles in 100ms, swap in the full shader once it's ready in the background.

Claude implemented all of that. It didn't get there until I said "you're cycling on surface fixes, the problem is somewhere else." That's the working pattern that came out of this whole project. AI is excellent at implementation. It's a typing partner that's read every framework. It is sometimes wrong about diagnosis, especially when the right move is to step back and rethink rather than fix harder. The judgment call about when to step back stays human.

A few small patterns from this collaboration that compounded:

**Start with the smallest working thing.** A sphere on a fullscreen quad with Phong lighting. Once that pipeline was proven, every feature after was an incremental addition to something that already rendered.

**Screenshots are the protocol.** Claude can't see your screen. Sending a screenshot of a working configuration ("save this as Jellyfish, make it the default") communicates in one image what would take three paragraphs of text.

**Name your configurations.** Once we had Deep Sea, Jellyfish, Crystal Array, Vortex, and a dozen others, the conversation got a vocabulary. "Make Jellyfish the default" is faster than "set spacing to 6, palette to forest, animation to pulse, threshold to 0.5."

These are useful. They aren't the point of this article.

## What Stayed Experimental

Two things came along for the ride and didn't quite fit. A generative audio system using Web Audio API oscillators and microphone-driven FFT analysis, where the geometry would react to whatever was playing. A SignalR-based session model where multiple people could share a configuration in real time. Both shipped working code. Neither felt like the right direction.

The audio reactivity worked, and didn't add to the experience the way I'd hoped. The shared sessions worked, and raised more questions than they answered: what's the social model here, who's the audience, why would anyone want this? I moved both of them behind an experimental flag, the way you'd put a beta feature behind a setting. They're available to anyone who turns them on. Most people will never need to.

Pulling them out turned out to be more clarifying than building them. What surfaced once they were gone was a different question about what SDFs are actually for.

## Where the Math Wants to Go

After enough time in this codebase, a thought kept surfacing. Ray marching uses SDFs to render. The rendering is one thing the math can do. The math itself describes geometry, and lighting a pixel from the description is just the easiest thing to do with it.

If you can describe a shape with `length(p) - r`, and you can compose shapes with `min`, `max`, and `smin`, and you can apply domain tricks to tile and twist and mirror, and the whole thing is exact at every step, then in principle you can take that field and turn it into geometry that exists outside the GPU. A real mesh. A 3D-printable file. A part with a smooth blend you couldn't have produced in pure CSG. A lattice infill (gyroid, Schwartz-P, diamond) defined by a single trigonometric equation, made physically real.

The bridge between "render a field" and "manifest a field" is a level set extractor. The library that does this best is [Manifold](https://manifoldcad.org/). You feed it an SDF and a voxel grid resolution, it gives you a guaranteed-manifold mesh. The output is a real solid, watertight, ready to slice and print.

The maker-tier 3D modeling space is a strange shape. TinkerCAD is a toy. OpenSCAD is code-only and has no SDF support beyond raw level sets. Fusion 360 wants a subscription and a learning curve. nTop costs more than a car and ships with a sales call. The thing that should exist, a browser-native modeler where the file is a parametric program, where SDF lattices and smooth blends are first-class operations, where the math composes the way the math actually composes, doesn't yet exist as a focused product.

I've been building it. It's called Zeroset. The same SDF math that lights pixels in this browser ray marcher does real work over there: lattice infill, smooth boolean blends, parametric shapes that export to a printable mesh through a Manifold-backed level-set mesher. The shader I wrote for this article and the geometry kernel I'm writing for that product are mathematical cousins. One renders the field. The other extracts a manifold from it.

The ray marcher started as a banner I missed from my old site. It became, somewhere along the way, the thing that pointed me at the work I'm actually doing now. The rendering is a window into the math. The math is the part worth building on.

::sandbox-link{to="/sandbox/raymarcher" label="Try the Ray Marcher" description="Interactive WebGL2 ray marcher with SDF lattices, smooth booleans, and a Sierpinski fractal scene"}
::
