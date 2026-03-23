export const SCENE_MANDELBULB = `
// === SCENE 1: MANDELBULB ===

vec2 mandelbulbScene(vec3 p) {
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
`
