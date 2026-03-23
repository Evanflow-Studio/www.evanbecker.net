export const SCENE_LATTICE = `
// === SCENE 0: INFINITE LATTICE ===

vec2 latticeScene(vec3 p) {
  // Animated spatial transforms — centered on camera position so effects
  // follow the player instead of being anchored to world origin.
  // u_animOffset slides the center between camera (0.0) and world origin (1.0).
  vec3 animCenter = mix(u_cameraPos, vec3(0.0), u_animOffset);

  if (u_animation >= 1 && u_animation != 5) {
    vec3 rp = p - animCenter; // relative to animation center

    if (u_animation == 1) {
      // Wave — sine displacement ripples outward from you
      rp.y += sin(rp.x * 0.8 + u_time * 1.2) * 0.6 * cos(rp.z * 0.6 + u_time * 0.8);
      rp.x += cos(rp.z * 0.7 + u_time * 0.9) * 0.3;
    } else if (u_animation == 2) {
      // Twist — space rotates around your vertical axis
      float angle = rp.y * 0.4 * sin(u_time * 0.4);
      float c = cos(angle), s = sin(angle);
      rp.xz = mat2(c, -s, s, c) * rp.xz;
    } else if (u_animation == 3) {
      // Pulse — cells breathe outward from your position
      float dist = length(rp);
      float wave = sin(dist * 0.5 - u_time * 2.0) * 0.2;
      rp *= 1.0 + wave;
    } else if (u_animation == 4) {
      // Kaleidoscope — animated fold symmetry centered on you
      float a = u_time * 0.25;
      float c = cos(a), s = sin(a);
      rp.xy = mat2(c, -s, s, c) * rp.xy;
      rp = abs(rp);
      if (rp.x < rp.y) rp.xy = rp.yx;
      if (rp.y < rp.z) rp.yz = rp.zy;
      if (rp.x < rp.y) rp.xy = rp.yx;
    } else if (u_animation == 6) {
      // Ripple — radial wave emanating from your XZ position
      float dist = length(rp.xz);
      float wave = sin(dist * 1.5 - u_time * 3.0) * exp(-dist * 0.05);
      rp.y += wave * 1.2;
    } else if (u_animation == 7) {
      // Shatter — cells drift apart from your position
      float dist = length(rp);
      vec3 dir = normalize(rp + 0.001);
      float cycle = sin(u_time * 0.3) * 0.5 + 0.5;
      rp += dir * cycle * 1.5 * smoothstep(0.0, 8.0, dist);
    } else if (u_animation == 8) {
      // Morph — space warps around your position
      float t = sin(u_time * 0.4) * 0.5 + 0.5;
      vec3 twisted = rp;
      float angle = twisted.y * 0.3;
      float c = cos(angle), s = sin(angle);
      twisted.xz = mat2(c, -s, s, c) * twisted.xz;
      twisted *= 1.0 + 0.2 * sin(length(twisted) * 0.5);
      rp = mix(rp, twisted, t);
    }

    p = rp + animCenter; // transform back to world space
  }

  // Audio-reactive cell size modulation — bass expands, amplitude contracts
  float cellSize = mix(4.0, 10.0, u_cellSpacing) + u_bass * 0.8;
  vec3 cellId = floor((p + cellSize * 0.5) / cellSize);
  vec3 q = mod(p + cellSize * 0.5, cellSize) - cellSize * 0.5;

  float d;

  if (u_geoPreset == 0) {
    // Hollow Cube — rounded box with pulsing sphere subtracted
    float box = sdRoundBox(q, vec3(1.0), 0.05);
    float subRadius = mix(1.5, 0.4, u_wallThickness) + 0.15 * sin(u_time * 0.5);
    float sphere = sdSphere(q, subRadius);
    d = opSmoothSubtraction(sphere, box, 0.05);
  } else if (u_geoPreset == 1) {
    // Cross Beams — 3 intersecting rectangular beams
    float thick = mix(0.05, 0.45, u_wallThickness);
    float bx = sdBox(q, vec3(1.2, thick, thick));
    float by = sdBox(q, vec3(thick, 1.2, thick));
    float bz = sdBox(q, vec3(thick, thick, 1.2));
    d = min(bx, min(by, bz));
    float pulse = 0.03 * sin(u_time * 0.6);
    d += pulse;
  } else if (u_geoPreset == 2) {
    // Nested Spheres — two concentric shells with cutaway
    float shellThick = mix(0.02, 0.18, u_wallThickness);
    float outer = abs(sdSphere(q, 1.0)) - shellThick;
    float inner = abs(sdSphere(q, 0.5 + 0.1 * sin(u_time * 0.5))) - shellThick * 0.6;
    float cutPlane = max(q.x, q.y);
    float shell = opSmoothSubtraction(-cutPlane, outer, 0.05);
    d = min(shell, inner);
  } else if (u_geoPreset == 3) {
    // Frame Only — wireframe cube edges
    float edge = mix(0.02, 0.2, u_wallThickness);
    d = sdFrameBox(q, vec3(0.9), edge);
  } else {
    // Torus Lattice — torus in each cell, orientation varies by cell
    float tubeR = mix(0.06, 0.3, u_wallThickness);
    float ringR = 0.7;
    float hash = fract(sin(dot(cellId, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    vec3 tq = q;
    if (hash > 0.66) {
      tq = q.yxz;
    } else if (hash > 0.33) {
      tq = q.xzy;
    }
    d = sdTorus(tq, vec2(ringR, tubeR));
  }

  // Tiny breathing sphere at center (all presets)
  float center = sdSphere(q, 0.15 + 0.05 * sin(u_time * 0.8 + 1.0));
  d = opSmoothUnion(d, center, 0.1);

  // Lipschitz correction — scale down distance for space-warping animations
  // so the ray marcher takes smaller steps and doesn't overshoot through surfaces.
  // Base severity per animation, multiplied by quality-driven u_warpCorrection.
  float warpSeverity = 1.0;
  if (u_animation == 1) warpSeverity = 0.7;       // Wave
  else if (u_animation == 2) warpSeverity = 0.7;  // Twist
  else if (u_animation == 3) warpSeverity = 0.75; // Pulse
  else if (u_animation == 6) warpSeverity = 0.6;  // Ripple
  else if (u_animation == 7) warpSeverity = 0.6;  // Shatter
  else if (u_animation == 8) warpSeverity = 0.5;  // Morph
  d *= warpSeverity * u_warpCorrection;

  // Color param from cell position
  float colorT = fract(dot(cellId, vec3(0.123, 0.456, 0.789)));

  return vec2(d, colorT);
}
`
