export const SCENE_FRACTAL = `
// === SCENE 3: FRACTAL DESCENT (Infinite Menger Sponge fly-through) ===
//
// Seamless loop via two properties:
//   1. Self-similarity: zoom = pow(3, fract(t)). At 3x, the fractal is
//      identical to 1x, so the zoom resets invisibly.
//   2. Rotational symmetry: the Menger Sponge is invariant under 90° rotations.
//      One 90° turn per zoom cycle is invisible at the reset boundary.
//
// Camera path per cycle:
//   phase 0.0–0.3: fly straight into a tunnel (axis-aligned)
//   phase 0.3–0.7: at the center intersection, smooth 90° turn to next tunnel
//   phase 0.7–1.0: continue down the new tunnel as zoom completes
//   phase 1.0 → 0.0: zoom resets (self-similarity) + rotation resets (90° symmetry)
//
// All wander is periodic with the cycle (sin(phase * 2π)) so it loops too.

float mengerSponge(vec3 p, int iters, out float colorAccum) {
  float d = sdBox(p, vec3(1.0));
  float s = 1.0;
  colorAccum = 0.0;
  for (int i = 0; i < 16; i++) {
    if (i >= iters) break;
    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = abs(1.0 - 3.0 * abs(a));
    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float c = (min(da, min(db, dc)) - 1.0) / s;
    if (c > d) { d = c; colorAccum = float(i); }
  }
  return d;
}

vec2 fractalDescentScene(vec3 p) {
  // The fractal fly-through is self-animated via zoom + rotation.
  // Physical camera position (WASD movement) must be removed so the
  // fractal always renders relative to origin — otherwise walking away
  // from (0,0,0) puts us in a random cell offset and breaks everything.
  p -= u_cameraPos;

  float speed = 0.05;
  float t = u_time * speed;
  float phase = fract(t);
  float zoom = pow(3.0, phase);

  // --- 90° turn per cycle (axis-to-axis, through the central intersection) ---
  // Eased so the turn happens in the middle of the cycle where all tunnels meet.
  // At the edges of the cycle (phase near 0 or 1), the camera is axis-aligned
  // and flying straight through a tunnel.
  float turnEase = smoothstep(0.25, 0.75, phase);
  float turnAngle = turnEase * 1.5707963; // 0 → π/2

  // Rotate around Y axis (transitions from Z-tunnel to X-tunnel)
  float ct = cos(turnAngle), st = sin(turnAngle);
  p.xz = mat2(ct, -st, st, ct) * p.xz;

  // --- Periodic wander inside the tunnel ---
  // Uses sin(phase * 2π) which is zero at both phase=0 and phase=1 → loops.
  // Amplitude is well within the 1/3-width tunnel opening.
  float tau = 6.28318;
  p.x += sin(phase * tau) * 0.04;
  p.y += sin(phase * tau * 1.5 + 1.0) * 0.03;

  // --- Domain repetition (infinite sponges) ---
  // Cell size scales with zoom so neighbors maintain constant visual spacing.
  // Without this, neighboring sponges would appear to merge as zoom increases.
  float baseCellSize = 4.5;
  float cellSize = baseCellSize * zoom;
  vec3 cellId = floor((p + cellSize * 0.5) / cellSize);
  vec3 q = mod(p + cellSize * 0.5, cellSize) - cellSize * 0.5;

  // Zoom into the fractal — shrink cell-local space
  q /= zoom;

  // --- Menger Sponge SDF ---
  float colorAccum;
  float d = mengerSponge(q, u_iterations, colorAccum);

  // Scale distance back to world space
  d *= zoom;

  // --- Color ---
  // Varies by recursion depth, cycle phase, and cell position
  float cellVar = dot(cellId, vec3(0.13, 0.27, 0.41));
  float colorT = colorAccum * 0.2 + phase * 0.25 + cellVar;

  return vec2(d, colorT);
}
`
