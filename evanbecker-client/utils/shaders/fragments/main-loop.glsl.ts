export const MAIN_LOOP = `
// === MAIN RAY MARCH LOOP ===

// Shared ray march + shading logic used for both main view and minimap
vec4 marchView(vec2 pixelCoord, vec2 resolution, float zoom) {
  vec2 uv = (pixelCoord - 0.5 * resolution) / resolution.y;

  // Apply zoom — dividing uv narrows the FOV (telephoto effect)
  uv /= zoom;

  // FPS camera — position + look direction from yaw/pitch
  float cy = cos(u_cameraYaw), sy = sin(u_cameraYaw);
  float cp = cos(u_cameraPitch), sp = sin(u_cameraPitch);

  vec3 ro = u_cameraPos;
  vec3 forward = vec3(-sy * cp, sp, -cy * cp);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);
  vec3 rd = normalize(forward + uv.x * right + uv.y * up);

  // Background gradient — near-black for fractal scene, subtle palette tint for others
  vec3 bgTop = vec3(0.02, 0.02, 0.04);
  vec3 bgBot = (u_scene == 3) ? vec3(0.01, 0.01, 0.02) : getColor(0.5) * 0.08;
  vec3 col = mix(bgBot, bgTop, uv.y + 0.5);
  vec3 bgColor = col;

  // Ray march
  float t = 0.0;
  float minDist = 1e10;
  vec2 result;
  bool hit = false;

  for (int i = 0; i < 128; i++) {
    if (i >= u_maxSteps) break;
    vec3 p = ro + rd * t;
    result = sceneSDF(p);
    float d = result.x;

    minDist = min(minDist, d);
    if (d < u_hitThreshold) { hit = true; break; }
    if (t > u_maxDist) break;
    t += d;
  }

  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = estimateNormal(p);
    vec3 lightDir = normalize(u_lightDir);

    // Lighting
    float diff = max(dot(n, lightDir), 0.0);
    vec3 h = normalize(lightDir - rd);
    float spec = pow(max(dot(n, h), 0.0), 48.0);

    float shadow = cheapShadow(p + n * 0.01, lightDir);
    float ao = cheapAO(p, n);

    // Fresnel rim
    float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

    // Color from palette
    float colorT = result.y + u_time * 0.02;
    vec3 baseColor = getColor(colorT);
    vec3 rimColor = getColor(colorT + 0.3);

    vec3 ambient = 0.2 * baseColor * ao;
    vec3 diffCol = 0.7 * baseColor * diff * shadow;
    vec3 specCol = 0.6 * vec3(1.0) * spec * shadow;
    vec3 rimCol = rimColor * fresnel * 0.4;

    col = ambient + diffCol + specCol + rimCol;

    // Depth fog
    float fog = exp(-u_fogDensity * t * t);
    col = mix(bgColor, col, fog);
  } else {
    // Near-miss glow, faded by distance fog
    float glowIntensity = 0.08;
    float glow = exp(-16.0 * minDist) * step(0.0, 0.5 - minDist);
    // Fade glow with same fog as geometry — prevents bright spots at far distances
    float glowFog = exp(-u_fogDensity * t * t);
    col += getColor(0.5 + u_time * 0.02) * glow * glowIntensity * glowFog;
  }

  // Reinhard tone mapping + gamma
  col = col / (col + 1.0);
  col = pow(col, vec3(0.4545));

  return vec4(col, 1.0);
}

void main() {
  fragColor = marchView(gl_FragCoord.xy, u_resolution, u_zoom);
}
`
