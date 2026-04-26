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

void main() {
  vec2 uv = v_uv;

  // --- Chromatic Aberration ---
  float ca = u_chromaticAmount * 0.01;
  vec2 dir = uv - 0.5;
  float dist = length(dir);
  vec2 offset = dir * dist * ca;

  float r = texture(u_sceneTexture, uv + offset).r;
  float g = texture(u_sceneTexture, uv).g;
  float b = texture(u_sceneTexture, uv - offset).b;
  vec3 col = vec3(r, g, b);

  // --- Bloom — 13-tap weighted Gaussian ---
  if (u_bloomStrength > 0.0) {
    vec3 bloom = vec3(0.0);
    float totalWeight = 0.0;
    float bloomOffset = 2.0 / u_resolution.y;
    // Sample in a cross pattern (4 directions x 3 distances + center = 13 taps)
    for (int i = -3; i <= 3; i++) {
        float weight = exp(-0.5 * float(i * i) / 4.0);
        vec2 offsetH = vec2(float(i) * bloomOffset, 0.0);
        vec2 offsetV = vec2(0.0, float(i) * bloomOffset);
        vec3 sampleH = texture(u_sceneTexture, uv + offsetH).rgb;
        vec3 sampleV = texture(u_sceneTexture, uv + offsetV).rgb;
        float brightnessH = dot(sampleH, vec3(0.2126, 0.7152, 0.0722));
        float brightnessV = dot(sampleV, vec3(0.2126, 0.7152, 0.0722));
        bloom += sampleH * smoothstep(0.5, 1.2, brightnessH) * weight;
        bloom += sampleV * smoothstep(0.5, 1.2, brightnessV) * weight;
        totalWeight += weight * 2.0;
    }
    bloom /= totalWeight;
    col += bloom * u_bloomStrength;
  }

  fragColor = vec4(col, 1.0);
}
`
