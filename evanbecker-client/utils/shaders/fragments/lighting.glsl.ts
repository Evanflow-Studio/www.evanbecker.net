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

// Cheap directional shadow approximation — single SDF sample instead of ray march
float cheapShadow(vec3 p, vec3 lightDir) {
  float d = sceneD(p + lightDir * 0.3);
  return smoothstep(0.0, 0.3, d);
}

// Cheap AO — single SDF sample along normal
float cheapAO(vec3 p, vec3 n) {
  float d = sceneD(p + n * 0.15);
  return clamp(d / 0.15, 0.0, 1.0);
}
`
