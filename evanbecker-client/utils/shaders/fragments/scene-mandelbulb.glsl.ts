export const SCENE_MANDELBULB = `
// === SCENE 1: MANDELBULB (Hexagonal Lattice) ===
//
// The Mandelbulb is evaluated per-cell in a hexagonal grid on the XZ plane,
// with regular repetition on Y. This gives a more organic layout than
// the cubic grid used by the lattice scenes.
//
// Hex grid: two offset rectangular grids — pick whichever cell center
// is closer. This produces a proper hexagonal tiling.

vec2 mandelbulbSDF(vec3 p) {
  vec3 z = p;
  float dr = 1.0;
  float r = 0.0;
  float power = 8.0;
  float trap = 1.0;

  for (int i = 0; i < 12; i++) {
    if (i >= u_iterations) break;
    r = length(z);
    if (r > 2.0) break;

    trap = min(trap, length(z.xz));

    float theta = acos(z.z / r);
    float phi = atan(z.y, z.x);
    dr = pow(r, power - 1.0) * power * dr + 1.0;

    float zr = pow(r, power);
    theta = theta * power;
    phi = phi * power;

    z = zr * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
    z += p;
  }

  float d = 0.5 * log(r) * r / dr;
  return vec2(d, trap);
}

vec2 mandelbulbScene(vec3 p) {
  // Hexagonal grid parameters
  // The Mandelbulb has radius ~1.2, so cells need to be at least 3.0 apart
  float cellSize = 4.0;
  float rowHeight = cellSize * 1.7320508; // cellSize * sqrt(3)

  // Y-axis: simple repetition
  float yCell = floor((p.y + cellSize * 0.5) / cellSize);
  float qy = mod(p.y + cellSize * 0.5, cellSize) - cellSize * 0.5;

  // XZ plane: hexagonal tiling via two offset grids
  // Grid A: regular
  vec2 cellA = vec2(cellSize, rowHeight);
  vec2 idA = floor((p.xz + cellA * 0.5) / cellA);
  vec2 qA = mod(p.xz + cellA * 0.5, cellA) - cellA * 0.5;

  // Grid B: offset by half a cell in both X and Z
  vec2 offsetB = vec2(cellSize * 0.5, rowHeight * 0.5);
  vec2 idB = floor((p.xz + cellA * 0.5 - offsetB) / cellA);
  vec2 qB = mod(p.xz + cellA * 0.5 - offsetB, cellA) - cellA * 0.5;

  // Pick the closer cell center
  vec3 q;
  vec2 hexId;
  if (dot(qA, qA) < dot(qB, qB)) {
    q = vec3(qA.x, qy, qA.y);
    hexId = idA;
  } else {
    q = vec3(qB.x, qy, qB.y);
    hexId = idB;
  }

  // Slow rotation per cell for visual variety
  float cellHash = fract(sin(dot(vec3(hexId, yCell), vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  float rotAngle = u_time * 0.15 + cellHash * 6.28;
  float cr = cos(rotAngle), sr = sin(rotAngle);
  q.xz = mat2(cr, -sr, sr, cr) * q.xz;

  vec2 result = mandelbulbSDF(q);

  // Color: orbit trap + hex cell variety
  float colorT = result.y * 0.5 + cellHash * 0.3;
  return vec2(result.x, colorT);
}
`
