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

  // Background gradient from palette
  vec3 bgTop = vec3(0.02, 0.02, 0.04);
  vec3 bgBot = getColor(0.5) * 0.08;
  vec3 col = mix(bgBot, bgTop, uv.y + 0.5);
  vec3 bgColor = col;

  // Ray march
  float t = 0.0;
  float minDist = 1e10;
  vec2 result;
  bool hit = false;

  for (int i = 0; i < 512; i++) {
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

    float shadow = softShadow(p + n * 0.01, lightDir, 0.02, 10.0, 16.0);
    float ao = ambientOcclusion(p, n);

    // Fresnel rim
    float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

    // Color from palette
    float colorT = result.y + u_time * 0.02;
    vec3 baseColor = getColor(colorT);
    vec3 rimColor = getColor(colorT + 0.3);

    if (u_wireframe == 1) {
      // Wireframe mode — silhouette edges + structural edges
      float silhouette = pow(1.0 - abs(dot(n, -rd)), 1.5);
      // Structural edges where normal sharply changes axis
      float nx = abs(n.x), ny = abs(n.y), nz = abs(n.z);
      float maxN = max(nx, max(ny, nz));
      float structural = 1.0 - smoothstep(0.6, 0.95, maxN);
      float wire = max(silhouette, structural);

      float colorT = result.y + u_time * 0.02;
      vec3 wireColor = getColor(colorT) * 1.2;
      col = wireColor * wire * ao;

      // Depth fog (lighter in wireframe)
      float fog = exp(-u_fogDensity * 0.4 * t * t);
      col = mix(bgColor, col, fog);
    } else {
      vec3 ambient = 0.2 * baseColor * ao;
      vec3 diffCol = 0.7 * baseColor * diff * shadow;
      vec3 specCol = 0.6 * vec3(1.0) * spec * shadow;
      vec3 rimCol = rimColor * fresnel * 0.4;

      col = ambient + diffCol + specCol + rimCol;

      // Depth fog
      float fog = exp(-u_fogDensity * t * t);
      col = mix(bgColor, col, fog);
    }
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
  // Main view — uses zoom level
  fragColor = marchView(gl_FragCoord.xy, u_resolution, u_zoom);

  // Minimap inset — bottom-left corner, shows 1x zoom (wide angle overview)
  if (u_showMinimap == 1 && u_zoom > 1.05) {
    float mapScale = 0.2; // 20% of screen size
    vec2 mapSize = u_resolution * mapScale;
    vec2 mapOrigin = vec2(12.0, 12.0); // pixels from bottom-left
    vec2 localCoord = gl_FragCoord.xy - mapOrigin;

    if (localCoord.x >= 0.0 && localCoord.x < mapSize.x &&
        localCoord.y >= 0.0 && localCoord.y < mapSize.y) {
      // Remap local coord to full-screen equivalent for 1x zoom
      vec2 remapped = localCoord / mapScale;
      vec4 mapColor = marchView(remapped, u_resolution, 1.0);

      // Border
      float borderDist = min(min(localCoord.x, localCoord.y),
                             min(mapSize.x - localCoord.x, mapSize.y - localCoord.y));
      float border = 1.0 - smoothstep(0.0, 2.0, borderDist);
      mapColor.rgb = mix(mapColor.rgb, vec3(0.2, 0.6, 1.0), border * 0.8);

      // Slight dim to distinguish from main view
      mapColor.rgb *= 0.85;
      fragColor = mapColor;
    }
  }
}
`
