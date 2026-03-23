export const LIGHTING = `
// === LIGHTING HELPERS ===

vec3 estimateNormal(vec3 p) {
  float e = 0.001;
  return normalize(vec3(
    sceneD(vec3(p.x + e, p.y, p.z)) - sceneD(vec3(p.x - e, p.y, p.z)),
    sceneD(vec3(p.x, p.y + e, p.z)) - sceneD(vec3(p.x, p.y - e, p.z)),
    sceneD(vec3(p.x, p.y, p.z + e)) - sceneD(vec3(p.x, p.y, p.z - e))
  ));
}

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  for (int i = 0; i < 24; i++) {
    if (t >= maxt) break;
    float h = sceneD(ro + rd * t);
    if (h < 0.001) return 0.0;
    res = min(res, k * h / t);
    t += h;
  }
  return clamp(res, 0.0, 1.0);
}

float ambientOcclusion(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.01 + 0.12 * float(i);
    float d = sceneD(p + h * n);
    occ += (h - d) * sca;
    sca *= 0.95;
  }
  return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}
`
