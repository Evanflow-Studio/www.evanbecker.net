export const MAIN_LOOP = `
// === MAIN RAY MARCH LOOP ===

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

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
  bool hitPreview = false;

  for (int i = 0; i < 512; i++) {
    if (i >= u_maxSteps) break;
    vec3 p = ro + rd * t;
    result = sceneSDF(p);
    float d = result.x;

    // Check preview sphere (closer = higher priority)
    if (u_showPreview == 1) {
      float previewD = sdSphere(p - u_previewPos, 0.25);
      if (previewD < d) {
        d = previewD;
        if (previewD < u_hitThreshold) {
          hitPreview = true;
          hit = true;
          break;
        }
      }
    }

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

    // Color — red tint for preview, palette for everything else
    vec3 baseColor;
    vec3 rimColor;
    if (hitPreview) {
      baseColor = vec3(0.9, 0.15, 0.1);
      rimColor = vec3(1.0, 0.3, 0.2);
    } else {
      float colorT = result.y + u_time * 0.02 + u_mid * 0.4 * u_colorReact;
      baseColor = getColor(colorT);
      rimColor = getColor(colorT + 0.3);
    }

    if (u_wireframe == 1 && !hitPreview) {
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
      float fog = exp(-0.002 * t * t);
      col = mix(bgColor, col, fog);
    } else {
      vec3 ambient = 0.2 * baseColor * ao;
      vec3 diffCol = 0.7 * baseColor * diff * shadow;
      vec3 specCol = 0.6 * vec3(1.0) * spec * shadow;
      vec3 rimCol = rimColor * fresnel * 0.4;

      col = ambient + diffCol + specCol + rimCol;

      // Audio-driven color reactivity
      col *= 1.0 + u_bass * 0.3 * u_colorReact;
      col += vec3(u_treble * 0.15 * u_colorReact);

      // Preview pulsing glow
      if (hitPreview) {
        col += vec3(0.3, 0.05, 0.02) * (0.5 + 0.5 * sin(u_time * 4.0));
      }

      // Depth fog
      float fog = exp(-0.005 * t * t);
      col = mix(bgColor, col, fog);
    }
  } else {
    // Near-miss glow — boosted by treble
    float glowIntensity = 0.08 + u_treble * 0.3;
    float glow = exp(-16.0 * minDist) * step(0.0, 0.5 - minDist);
    col += getColor(0.5 + u_time * 0.02 + u_mid * 0.3) * glow * glowIntensity;
  }

  // Reinhard tone mapping + gamma
  col = col / (col + 1.0);
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`
