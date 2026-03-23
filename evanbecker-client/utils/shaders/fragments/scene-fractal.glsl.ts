export const SCENE_FRACTAL = `
// === SCENE 3: FRACTAL DESCENT (Menger Sponge with infinite zoom) ===

vec2 fractalDescentScene(vec3 p) {
  float phase = fract(u_time * 0.1);
  float zoom = pow(3.0, phase);

  p = zoom * p - (zoom - 1.0);

  float d = sdBox(p, vec3(1.0));
  float s = 1.0;
  float colorAccum = 0.0;

  for (int i = 0; i < 8; i++) {
    if (i >= u_iterations) break;
    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = abs(1.0 - 3.0 * abs(a));
    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float c = (min(da, min(db, dc)) - 1.0) / s;
    if (c > d) {
      d = c;
      colorAccum = float(i);
    }
  }

  d /= zoom;

  float colorT = colorAccum * 0.15 + length(p) * 0.08 + phase * 0.3;
  return vec2(d, colorT);
}
`
