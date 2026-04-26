export const SCENE_CSG = `
// === SCENE 2: CSG OPERATIONS ===

vec2 csgScene(vec3 p) {
  float anim = sin(u_time * 0.7) * 0.7;

  vec3 pl = p - vec3(-3.5, 0.0, 0.0);
  float unionD = opSmoothUnion(
    sdRoundBox(pl, vec3(0.7), 0.05),
    sdSphere(pl - vec3(0.0, anim, 0.0), 0.75),
    0.3
  );

  vec3 pc = p;
  float subD = opSmoothSubtraction(
    sdSphere(pc - vec3(0.0, anim, 0.0), 0.85),
    sdRoundBox(pc, vec3(0.7), 0.05),
    0.15
  );

  vec3 pr = p - vec3(3.5, 0.0, 0.0);
  float interD = opSmoothIntersection(
    sdRoundBox(pr, vec3(0.7), 0.05),
    sdSphere(pr - vec3(0.0, anim, 0.0), 0.85),
    0.15
  );

  float d = min(unionD, min(subD, interD));
  float colorT = (p.x + 5.0) / 10.0;

  return vec2(d, colorT);
}
`
