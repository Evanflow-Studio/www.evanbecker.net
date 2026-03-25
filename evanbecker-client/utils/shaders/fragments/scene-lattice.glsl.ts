export const SCENE_LATTICE = `
// === SCENE 0: INFINITE LATTICE ===

// --- Animation transforms (single function to minimize compile-time branching) ---

vec3 applyAnimation(vec3 rp, float time, int anim) {
  if (anim == 1) { // Wave
    rp.y += sin(rp.x * 0.8 + time * 1.2) * 0.6 * cos(rp.z * 0.6 + time * 0.8);
    rp.x += cos(rp.z * 0.7 + time * 0.9) * 0.3;
  } else if (anim == 2) { // Twist
    float angle = rp.y * 0.4 * sin(time * 0.4);
    float c = cos(angle), s = sin(angle);
    rp.xz = mat2(c, -s, s, c) * rp.xz;
  } else if (anim == 3) { // Pulse
    rp *= 1.0 + sin(length(rp) * 0.5 - time * 2.0) * 0.2;
  } else if (anim == 4) { // Kaleidoscope
    float a = time * 0.25;
    float c = cos(a), s = sin(a);
    rp.xy = mat2(c, -s, s, c) * rp.xy;
    rp = abs(rp);
    if (rp.x < rp.y) rp.xy = rp.yx;
    if (rp.y < rp.z) rp.yz = rp.zy;
    if (rp.x < rp.y) rp.xy = rp.yx;
  } else if (anim == 6) { // Ripple
    float dist = length(rp.xz);
    rp.y += sin(dist * 1.5 - time * 3.0) * exp(-dist * 0.05) * 1.2;
  } else if (anim == 7) { // Shatter
    float dist = length(rp);
    vec3 dir = normalize(rp + 0.001);
    rp += dir * (sin(time * 0.3) * 0.5 + 0.5) * 1.5 * smoothstep(0.0, 8.0, dist);
  } else if (anim == 8) { // Morph
    float t = sin(time * 0.4) * 0.5 + 0.5;
    vec3 tw = rp;
    float angle = tw.y * 0.3;
    float c = cos(angle), s = sin(angle);
    tw.xz = mat2(c, -s, s, c) * tw.xz;
    tw *= 1.0 + 0.2 * sin(length(tw) * 0.5);
    rp = mix(rp, tw, t);
  }
  // anim == 0 (None), 5 (Orbit), 9 (Custom) — no transform
  return rp;
}

// --- Geometry preset (single unified function to minimize branching) ---

float evalGeometry(vec3 q, vec3 cellId, float wallThickness, float time, int preset) {
  if (preset == 1) {
    // Cross Beams
    float thick = mix(0.05, 0.45, wallThickness);
    return min(sdBox(q, vec3(1.2, thick, thick)), min(sdBox(q, vec3(thick, 1.2, thick)), sdBox(q, vec3(thick, thick, 1.2))));
  }
  if (preset == 2) {
    // Nested Spheres
    float st = mix(0.02, 0.18, wallThickness);
    float outer = abs(sdSphere(q, 1.0)) - st;
    float inner = abs(sdSphere(q, 0.5 + 0.1 * sin(time * 0.5))) - st * 0.6;
    return min(opSmoothSubtraction(-max(q.x, q.y), outer, 0.05), inner);
  }
  if (preset == 3) {
    // Frame Only
    return sdFrameBox(q, vec3(0.9), mix(0.02, 0.2, wallThickness));
  }
  if (preset == 4) {
    // Torus Lattice
    float tubeR = mix(0.06, 0.3, wallThickness);
    float hash = fract(sin(dot(cellId, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    vec3 tq = hash > 0.66 ? q.yxz : (hash > 0.33 ? q.xzy : q);
    return sdTorus(tq, vec2(0.7, tubeR));
  }
  if (preset == 5) {
    // Gyroid
    return sdGyroid(q, 2.5 + 0.3 * sin(time * 0.2), mix(0.03, 0.4, wallThickness));
  }
  if (preset == 6) {
    // Menger Cross
    float box = sdBox(q, vec3(1.0));
    float hs = 0.35 * (1.0 - wallThickness + 0.1);
    return max(box, -min(sdBox(q, vec3(2.0, hs, hs)), min(sdBox(q, vec3(hs, 2.0, hs)), sdBox(q, vec3(hs, hs, 2.0)))));
  }
  if (preset == 7) {
    // Chain Links
    float tubeR = mix(0.04, 0.18, wallThickness);
    return min(sdTorus(q, vec2(0.55, tubeR)), sdTorus(vec3(q.x + 0.55, q.z, q.y), vec2(0.55, tubeR)));
  }
  if (preset == 8) {
    // Spiral Column
    float tubeR = mix(0.06, 0.2, wallThickness);
    return opSmoothUnion(sdHelix(q, 0.6, tubeR, 1.0 + 0.3 * sin(time * 0.3)), sdCylinder(q, 1.2, tubeR * 0.7), 0.08);
  }
  if (preset == 9) {
    // Diamond Lattice
    float size = 0.9;
    return max(abs(sdOctahedron(q, size)) - mix(0.02, 0.3, wallThickness), sdSphere(q, size * 0.75 + 0.05 * sin(time * 0.6)));
  }
  // Default: Hollow Cube (preset 0)
  float box = sdRoundBox(q, vec3(1.0), 0.05);
  float subR = mix(1.5, 0.4, wallThickness) + 0.15 * sin(time * 0.5);
  return opSmoothSubtraction(sdSphere(q, subR), box, 0.05);
}

// --- Warp severity per animation (for Lipschitz correction) ---

float getWarpSeverity(int anim) {
  if (anim == 1) return 0.7;       // Wave
  if (anim == 2) return 0.7;       // Twist
  if (anim == 3) return 0.75;      // Pulse
  if (anim == 6) return 0.6;       // Ripple
  if (anim == 7) return 0.6;       // Shatter
  if (anim == 8) return 0.5;       // Morph
  return 1.0;                       // None, Kaleidoscope, Orbit, Custom
}

// --- Main lattice scene entry point ---

vec2 latticeScene(vec3 p) {
  // Animation center: slides between camera (0.0) and world origin (1.0)
  vec3 animCenter = mix(u_cameraPos, vec3(0.0), u_animOffset);

  // Apply spatial animation transform
  if (u_animation >= 1 && u_animation != 5) {
    vec3 rp = p - animCenter;
    rp = applyAnimation(rp, u_time, u_animation);
    // __CUSTOM_ANIMATION_INJECT__
    p = rp + animCenter;
  }

  // Domain repetition
  float cellSize = mix(4.0, 10.0, u_cellSpacing);
  vec3 cellId = floor((p + cellSize * 0.5) / cellSize);
  vec3 q = mod(p + cellSize * 0.5, cellSize) - cellSize * 0.5;

  // Geometry dispatch
  float d = evalGeometry(q, cellId, u_wallThickness, u_time, u_geoPreset);

  // Breathing center sphere (all presets)
  float center = sdSphere(q, 0.15 + 0.05 * sin(u_time * 0.8 + 1.0));
  d = opSmoothUnion(d, center, 0.1);

  // Lipschitz correction for space-warping animations
  // When warpSeverity < 1.0, reduce step size to prevent overshooting
  float warpSeverity = getWarpSeverity(u_animation);
  d *= mix(1.0, warpSeverity * u_warpCorrection, step(0.5, 1.0 - warpSeverity));

  // Color from cell position
  float colorT = fract(dot(cellId, vec3(0.123, 0.456, 0.789)));
  return vec2(d, colorT);
}
`
