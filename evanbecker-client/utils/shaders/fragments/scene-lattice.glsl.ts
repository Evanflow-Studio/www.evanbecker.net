export const SCENE_LATTICE = `
// === SCENE 0: INFINITE LATTICE ===

// --- Animation transforms (each returns transformed position) ---

vec3 animWave(vec3 rp, float time) {
  rp.y += sin(rp.x * 0.8 + time * 1.2) * 0.6 * cos(rp.z * 0.6 + time * 0.8);
  rp.x += cos(rp.z * 0.7 + time * 0.9) * 0.3;
  return rp;
}

vec3 animTwist(vec3 rp, float time) {
  float angle = rp.y * 0.4 * sin(time * 0.4);
  float c = cos(angle), s = sin(angle);
  rp.xz = mat2(c, -s, s, c) * rp.xz;
  return rp;
}

vec3 animPulse(vec3 rp, float time) {
  float dist = length(rp);
  float wave = sin(dist * 0.5 - time * 2.0) * 0.2;
  return rp * (1.0 + wave);
}

vec3 animKaleidoscope(vec3 rp, float time) {
  float a = time * 0.25;
  float c = cos(a), s = sin(a);
  rp.xy = mat2(c, -s, s, c) * rp.xy;
  rp = abs(rp);
  if (rp.x < rp.y) rp.xy = rp.yx;
  if (rp.y < rp.z) rp.yz = rp.zy;
  if (rp.x < rp.y) rp.xy = rp.yx;
  return rp;
}

vec3 animRipple(vec3 rp, float time) {
  float dist = length(rp.xz);
  float wave = sin(dist * 1.5 - time * 3.0) * exp(-dist * 0.05);
  rp.y += wave * 1.2;
  return rp;
}

vec3 animShatter(vec3 rp, float time) {
  float dist = length(rp);
  vec3 dir = normalize(rp + 0.001);
  float cycle = sin(time * 0.3) * 0.5 + 0.5;
  return rp + dir * cycle * 1.5 * smoothstep(0.0, 8.0, dist);
}

vec3 animMorph(vec3 rp, float time) {
  float t = sin(time * 0.4) * 0.5 + 0.5;
  vec3 twisted = rp;
  float angle = twisted.y * 0.3;
  float c = cos(angle), s = sin(angle);
  twisted.xz = mat2(c, -s, s, c) * twisted.xz;
  twisted *= 1.0 + 0.2 * sin(length(twisted) * 0.5);
  return mix(rp, twisted, t);
}

// --- Geometry presets (each returns SDF distance) ---

float geoHollowCube(vec3 q, float wallThickness, float time) {
  float box = sdRoundBox(q, vec3(1.0), 0.05);
  float subRadius = mix(1.5, 0.4, wallThickness) + 0.15 * sin(time * 0.5);
  float sphere = sdSphere(q, subRadius);
  return opSmoothSubtraction(sphere, box, 0.05);
}

float geoCrossBeams(vec3 q, float wallThickness, float time) {
  float thick = mix(0.05, 0.45, wallThickness);
  float bx = sdBox(q, vec3(1.2, thick, thick));
  float by = sdBox(q, vec3(thick, 1.2, thick));
  float bz = sdBox(q, vec3(thick, thick, 1.2));
  return min(bx, min(by, bz)) + 0.03 * sin(time * 0.6);
}

float geoNestedSpheres(vec3 q, float wallThickness, float time) {
  float shellThick = mix(0.02, 0.18, wallThickness);
  float outer = abs(sdSphere(q, 1.0)) - shellThick;
  float inner = abs(sdSphere(q, 0.5 + 0.1 * sin(time * 0.5))) - shellThick * 0.6;
  float cutPlane = max(q.x, q.y);
  float shell = opSmoothSubtraction(-cutPlane, outer, 0.05);
  return min(shell, inner);
}

float geoFrameOnly(vec3 q, float wallThickness) {
  float edge = mix(0.02, 0.2, wallThickness);
  return sdFrameBox(q, vec3(0.9), edge);
}

float geoTorusLattice(vec3 q, vec3 cellId, float wallThickness) {
  float tubeR = mix(0.06, 0.3, wallThickness);
  float ringR = 0.7;
  float hash = fract(sin(dot(cellId, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  vec3 tq = q;
  if (hash > 0.66) tq = q.yxz;
  else if (hash > 0.33) tq = q.xzy;
  return sdTorus(tq, vec2(ringR, tubeR));
}

float geoGyroid(vec3 q, float wallThickness, float time) {
  float thickness = mix(0.03, 0.4, wallThickness);
  float scale = 2.5 + 0.3 * sin(time * 0.2);
  return sdGyroid(q, scale, thickness);
}

float geoMengerCross(vec3 q, float wallThickness) {
  float box = sdBox(q, vec3(1.0));
  float holeSize = 0.35 * (1.0 - wallThickness + 0.1);
  float cx = sdBox(q, vec3(2.0, holeSize, holeSize));
  float cy = sdBox(q, vec3(holeSize, 2.0, holeSize));
  float cz = sdBox(q, vec3(holeSize, holeSize, 2.0));
  return max(box, -min(cx, min(cy, cz)));
}

float geoChainLinks(vec3 q, float wallThickness) {
  float tubeR = mix(0.04, 0.18, wallThickness);
  float ringR = 0.55;
  float t1 = sdTorus(q, vec2(ringR, tubeR));
  vec3 q2 = vec3(q.x + ringR, q.z, q.y);
  float t2 = sdTorus(q2, vec2(ringR, tubeR));
  return min(t1, t2);
}

float geoSpiralColumn(vec3 q, float wallThickness, float time) {
  float tubeR = mix(0.06, 0.2, wallThickness);
  float pitch = 1.0 + 0.3 * sin(time * 0.3);
  float helix = sdHelix(q, 0.6, tubeR, pitch);
  float column = sdCylinder(q, 1.2, tubeR * 0.7);
  return opSmoothUnion(helix, column, 0.08);
}

float geoDiamondLattice(vec3 q, float wallThickness, float time) {
  float size = 0.9;
  float oct = sdOctahedron(q, size);
  float sph = sdSphere(q, size * 0.75 + 0.05 * sin(time * 0.6));
  float thickness = mix(0.02, 0.3, wallThickness);
  return max(abs(oct) - thickness, sph);
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

    if (u_animation == 1) rp = animWave(rp, u_time);
    else if (u_animation == 2) rp = animTwist(rp, u_time);
    else if (u_animation == 3) rp = animPulse(rp, u_time);
    else if (u_animation == 4) rp = animKaleidoscope(rp, u_time);
    else if (u_animation == 6) rp = animRipple(rp, u_time);
    else if (u_animation == 7) rp = animShatter(rp, u_time);
    else if (u_animation == 8) rp = animMorph(rp, u_time);

    // __CUSTOM_ANIMATION_INJECT__
    p = rp + animCenter;
  }

  // Domain repetition
  float cellSize = mix(4.0, 10.0, u_cellSpacing);
  vec3 cellId = floor((p + cellSize * 0.5) / cellSize);
  vec3 q = mod(p + cellSize * 0.5, cellSize) - cellSize * 0.5;

  // Geometry dispatch
  float d;
  if (u_geoPreset == 0) d = geoHollowCube(q, u_wallThickness, u_time);
  else if (u_geoPreset == 1) d = geoCrossBeams(q, u_wallThickness, u_time);
  else if (u_geoPreset == 2) d = geoNestedSpheres(q, u_wallThickness, u_time);
  else if (u_geoPreset == 3) d = geoFrameOnly(q, u_wallThickness);
  else if (u_geoPreset == 4) d = geoTorusLattice(q, cellId, u_wallThickness);
  else if (u_geoPreset == 5) d = geoGyroid(q, u_wallThickness, u_time);
  else if (u_geoPreset == 6) d = geoMengerCross(q, u_wallThickness);
  else if (u_geoPreset == 7) d = geoChainLinks(q, u_wallThickness);
  else if (u_geoPreset == 8) d = geoSpiralColumn(q, u_wallThickness, u_time);
  else d = geoDiamondLattice(q, u_wallThickness, u_time);

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
