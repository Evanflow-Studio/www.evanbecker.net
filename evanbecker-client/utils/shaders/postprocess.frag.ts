export const POST_VERTEX = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

export const POST_FRAGMENT = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_sceneTexture;
uniform vec2 u_resolution;
uniform float u_bloomStrength;
uniform float u_chromaticAmount;
uniform float u_vignetteStrength;

void main() {
  vec2 uv = v_uv;
  vec2 texel = 1.0 / u_resolution;

  // --- Chromatic Aberration ---
  float ca = u_chromaticAmount * 0.01;
  vec2 dir = uv - 0.5;
  float dist = length(dir);
  vec2 offset = dir * dist * ca;

  float r = texture(u_sceneTexture, uv + offset).r;
  float g = texture(u_sceneTexture, uv).g;
  float b = texture(u_sceneTexture, uv - offset).b;
  vec3 col = vec3(r, g, b);

  // --- Bloom (single-pass approximation) ---
  if (u_bloomStrength > 0.0) {
    vec3 bloom = vec3(0.0);
    float total = 0.0;
    // 13-tap box blur on bright pixels
    for (float x = -3.0; x <= 3.0; x += 1.0) {
      for (float y = -3.0; y <= 3.0; y += 1.0) {
        vec2 sampleUV = uv + vec2(x, y) * texel * 3.0;
        vec3 s = texture(u_sceneTexture, sampleUV).rgb;
        // Extract bright areas
        float brightness = max(s.r, max(s.g, s.b));
        float knee = smoothstep(0.6, 1.2, brightness);
        bloom += s * knee;
        total += 1.0;
      }
    }
    bloom /= total;
    col += bloom * u_bloomStrength;
  }

  // --- Vignette ---
  if (u_vignetteStrength > 0.0) {
    float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * u_vignetteStrength * 3.0;
    col *= clamp(vig, 0.0, 1.0);
  }

  fragColor = vec4(col, 1.0);
}
`
