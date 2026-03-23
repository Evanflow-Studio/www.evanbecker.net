export const LOCAL_GEOMETRY = `
// === LOCAL GEOMETRY (click-to-place objects) ===
// Each object: xyz = position, w = shape type (0=sphere, 1=cube, 2=torus, 3=octahedron)
// Evaluated in world space — not repeated by domain rep

float sdOctahedron(vec3 p, float s) {
  p = abs(p);
  float m = p.x + p.y + p.z - s;
  vec3 q;
  if (3.0 * p.x < m) q = p.xyz;
  else if (3.0 * p.y < m) q = p.yzx;
  else if (3.0 * p.z < m) q = p.zxy;
  else return m * 0.57735027;
  float k = clamp(0.5 * (q.z - q.y + s), 0.0, s);
  return length(vec3(q.x, q.y - s + k, q.z - k));
}

vec2 evaluateLocalObjects(vec3 p) {
  float d = 1e10;
  float colorT = 0.0;

  for (int i = 0; i < 8; i++) {
    if (i >= u_localObjectCount) break;
    vec4 obj = u_localObjects[i];
    vec3 localP = p - obj.xyz;
    int shapeType = int(obj.w);
    float objD;

    if (shapeType == 0) {
      objD = sdSphere(localP, 0.4);
    } else if (shapeType == 1) {
      objD = sdRoundBox(localP, vec3(0.35), 0.05);
    } else if (shapeType == 2) {
      objD = sdTorus(localP, vec2(0.35, 0.12));
    } else {
      objD = sdOctahedron(localP, 0.45);
    }

    if (objD < d) {
      d = objD;
      // Color based on object index for variety
      colorT = float(i) * 0.13 + 0.5;
    }
  }

  return vec2(d, colorT);
}
`
