// Minimal shader that compiles in <100ms — used as placeholder while full shader compiles
export const FRAGMENT_SHADER_FAST = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_cameraYaw;
uniform float u_cameraPitch;
uniform vec3 u_cameraPos;
uniform int u_scene;
uniform int u_palette;
uniform vec3 u_lightDir;
uniform float u_cellSpacing;
uniform float u_wallThickness;
uniform float u_fogDensity;
uniform float u_zoom;

// Minimal palette
vec3 getColorFast(float t) {
  vec3 a = vec3(0.5), b = vec3(0.5), c = vec3(1.0), d = vec3(0.0, 0.33, 0.67);
  return a + b * cos(6.28318 * (c * t + d));
}

// Only hollow cube SDF — no branching
float sdBoxFast(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sdSphereFast(vec3 p, float r) {
  return length(p) - r;
}

float sceneFast(vec3 p) {
  float cs = mix(4.0, 10.0, u_cellSpacing);
  vec3 q = mod(p + cs * 0.5, cs) - cs * 0.5;
  float box = sdBoxFast(q, vec3(1.0)) - 0.05;
  float sub = sdSphereFast(q, mix(1.5, 0.4, u_wallThickness));
  return max(box, -sub);
}

vec3 normalFast(vec3 p) {
  float e = 0.002;
  return normalize(vec3(
    sceneFast(vec3(p.x+e,p.y,p.z)) - sceneFast(vec3(p.x-e,p.y,p.z)),
    sceneFast(vec3(p.x,p.y+e,p.z)) - sceneFast(vec3(p.x,p.y-e,p.z)),
    sceneFast(vec3(p.x,p.y,p.z+e)) - sceneFast(vec3(p.x,p.y,p.z-e))
  ));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  uv /= u_zoom;

  float cy = cos(u_cameraYaw), sy = sin(u_cameraYaw);
  float cp = cos(u_cameraPitch), sp = sin(u_cameraPitch);
  vec3 ro = u_cameraPos;
  vec3 fw = vec3(-sy*cp, sp, -cy*cp);
  vec3 rt = normalize(cross(fw, vec3(0,1,0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(fw + uv.x*rt + uv.y*up);

  vec3 bgTop = vec3(0.02, 0.02, 0.04);
  vec3 bgBot = getColorFast(0.5) * 0.08;
  vec3 col = mix(bgBot, bgTop, uv.y + 0.5);

  float t = 0.0;
  bool hit = false;
  // Very few steps — just enough to show geometry
  for (int i = 0; i < 48; i++) {
    float d = sceneFast(ro + rd * t);
    if (d < 0.003) { hit = true; break; }
    if (t > 200.0) break;
    t += d;
  }

  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = normalFast(p);
    float diff = max(dot(n, normalize(u_lightDir)), 0.0);
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

    vec3 cellId = floor((p + mix(4.0,10.0,u_cellSpacing)*0.5) / mix(4.0,10.0,u_cellSpacing));
    float ct = fract(dot(cellId, vec3(0.123, 0.456, 0.789)));
    vec3 baseCol = getColorFast(ct + u_time * 0.02);

    col = baseCol * (0.2 + 0.7 * diff) + vec3(1.0) * fres * 0.3;
    float fog = exp(-u_fogDensity * t * t);
    col = mix(mix(bgBot, bgTop, uv.y+0.5), col, fog);
  }

  col = col / (col + 1.0);
  col = pow(col, vec3(0.4545));
  fragColor = vec4(col, 1.0);
}
`
