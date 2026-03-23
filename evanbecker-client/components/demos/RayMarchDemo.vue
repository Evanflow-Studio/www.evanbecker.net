<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const fps = ref(0)
const iterations = ref(6)
const colorHue = ref(0.58)
const lightAngleX = ref(0.5)
const lightAngleY = ref(0.7)
const error = ref<string | null>(null)

// Camera orbit state
const cameraTheta = ref(0.8)
const cameraPhi = ref(0.35)
const cameraDistance = ref(2.5)
const isDragging = ref(false)
const lastMouse = ref({ x: 0, y: 0 })
const autoRotate = ref(true)
const lastInteraction = ref(0)

let gl: WebGL2RenderingContext | null = null
let program: WebGLProgram | null = null
let animFrameId = 0
let startTime = 0
let frameCount = 0
let lastFpsTime = 0

// Expose internals for testing
const shaderCompiled = ref(false)
const glContextCreated = ref(false)
const glErrors = ref<string[]>([])

defineExpose({
  canvasRef,
  gl: () => gl,
  program: () => program,
  shaderCompiled,
  glContextCreated,
  glErrors,
  fps,
  iterations,
})

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_cameraTheta;
uniform float u_cameraPhi;
uniform float u_cameraDistance;
uniform int u_iterations;
uniform float u_colorHue;
uniform vec3 u_lightDir;

// Distance functions
float sdSphere(vec3 p, float s) {
  return length(p) - s;
}

float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 d = abs(p) - b;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0)) - r;
}

float smoothSubtraction(float d1, float d2, float k) {
  float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
  return mix(d2, -d1, h) + k * h * (1.0 - h);
}

float smoothIntersection(float d1, float d2, float k) {
  float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) + k * h * (1.0 - h);
}

// Mandelbulb fractal
float mandelbulb(vec3 pos, int iterations) {
  vec3 z = pos;
  float dr = 1.0;
  float r = 0.0;
  float power = 8.0;

  for (int i = 0; i < 12; i++) {
    if (i >= iterations) break;
    r = length(z);
    if (r > 2.0) break;

    // Convert to polar coordinates
    float theta = acos(z.z / r);
    float phi = atan(z.y, z.x);
    dr = pow(r, power - 1.0) * power * dr + 1.0;

    // Scale and rotate the point
    float zr = pow(r, power);
    theta = theta * power;
    phi = phi * power;

    // Convert back to cartesian
    z = zr * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
    z += pos;
  }

  return 0.5 * log(r) * r / dr;
}

float sceneSDF(vec3 p) {
  return mandelbulb(p, u_iterations);
}

vec3 estimateNormal(vec3 p) {
  float e = 0.001;
  return normalize(vec3(
    sceneSDF(vec3(p.x + e, p.y, p.z)) - sceneSDF(vec3(p.x - e, p.y, p.z)),
    sceneSDF(vec3(p.x, p.y + e, p.z)) - sceneSDF(vec3(p.x, p.y - e, p.z)),
    sceneSDF(vec3(p.x, p.y, p.z + e)) - sceneSDF(vec3(p.x, p.y, p.z - e))
  ));
}

// Soft shadows
float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  for (int i = 0; i < 32; i++) {
    if (t >= maxt) break;
    float h = sceneSDF(ro + rd * t);
    if (h < 0.001) return 0.0;
    res = min(res, k * h / t);
    t += h;
  }
  return clamp(res, 0.0, 1.0);
}

// Ambient occlusion
float ambientOcclusion(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.01 + 0.12 * float(i);
    float d = sceneSDF(p + h * n);
    occ += (h - d) * sca;
    sca *= 0.95;
  }
  return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

// HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

  // Camera setup from spherical coordinates
  float ct = cos(u_cameraTheta);
  float st = sin(u_cameraTheta);
  float cp = cos(u_cameraPhi);
  float sp = sin(u_cameraPhi);

  vec3 ro = u_cameraDistance * vec3(st * cp, sp, ct * cp);
  vec3 target = vec3(0.0);
  vec3 forward = normalize(target - ro);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);
  vec3 rd = normalize(forward + uv.x * right + uv.y * up);

  // Background gradient
  vec3 bgTop = vec3(0.047, 0.067, 0.125); // #0B1120
  vec3 bgBot = hsv2rgb(vec3(u_colorHue, 0.7, 0.15));
  vec3 col = mix(bgBot, bgTop, uv.y + 0.5);

  // Ray march
  float t = 0.0;
  float d;
  bool hit = false;
  for (int i = 0; i < 128; i++) {
    vec3 p = ro + rd * t;
    d = sceneSDF(p);
    if (d < 0.001) { hit = true; break; }
    if (t > 20.0) break;
    t += d;
  }

  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = estimateNormal(p);
    vec3 lightDir = normalize(u_lightDir);

    // Diffuse
    float diff = max(dot(n, lightDir), 0.0);

    // Specular (Blinn-Phong)
    vec3 h = normalize(lightDir - rd);
    float spec = pow(max(dot(n, h), 0.0), 32.0);

    // Soft shadow
    float shadow = softShadow(p + n * 0.01, lightDir, 0.02, 10.0, 16.0);

    // Ambient occlusion
    float ao = ambientOcclusion(p, n);

    // Base color from fractal depth
    vec3 baseColor = hsv2rgb(vec3(u_colorHue, 0.65, 1.0));
    vec3 ambient = 0.25 * baseColor * ao;
    vec3 diffCol = 0.8 * baseColor * diff * shadow;
    vec3 specCol = 0.5 * vec3(1.0) * spec * shadow;

    col = ambient + diffCol + specCol;

    // Fog
    float fog = exp(-0.05 * t * t);
    col = mix(bgTop, col, fog);
  }

  // Tone mapping
  col = col / (col + 1.0);
  col = pow(col, vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || 'Unknown error'
    glErrors.value.push(info)
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function initGL() {
  const canvas = canvasRef.value
  if (!canvas) return

  gl = canvas.getContext('webgl2', { antialias: false, powerPreference: 'high-performance' })
  if (!gl) {
    error.value = 'WebGL2 is not supported in this browser.'
    return
  }
  glContextCreated.value = true

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  if (!vs || !fs) {
    error.value = 'Shader compilation failed: ' + glErrors.value.join('; ')
    return
  }

  program = gl.createProgram()
  if (!program) return
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    error.value = 'Program link failed: ' + (gl.getProgramInfoLog(program) || '')
    return
  }
  shaderCompiled.value = true

  // Full-screen quad
  const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  gl.useProgram(program)
  startTime = performance.now()
  lastFpsTime = startTime
  frameCount = 0
}

function render() {
  if (!gl || !program) return

  const canvas = canvasRef.value
  if (!canvas) return

  const dpr = Math.min(window.devicePixelRatio, 2)
  const w = canvas.clientWidth * dpr
  const h = canvas.clientHeight * dpr
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }

  gl.viewport(0, 0, canvas.width, canvas.height)

  const now = performance.now()
  const elapsed = (now - startTime) / 1000.0

  // Auto-rotate when idle
  if (autoRotate.value && now - lastInteraction.value > 2000) {
    cameraTheta.value += 0.003
  }

  // Compute light direction from angles
  const lx = Math.cos(lightAngleX.value * Math.PI * 2) * Math.cos(lightAngleY.value * Math.PI * 0.5)
  const ly = Math.sin(lightAngleY.value * Math.PI * 0.5)
  const lz = Math.sin(lightAngleX.value * Math.PI * 2) * Math.cos(lightAngleY.value * Math.PI * 0.5)

  gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height)
  gl.uniform1f(gl.getUniformLocation(program, 'u_time'), elapsed)
  gl.uniform1f(gl.getUniformLocation(program, 'u_cameraTheta'), cameraTheta.value)
  gl.uniform1f(gl.getUniformLocation(program, 'u_cameraPhi'), cameraPhi.value)
  gl.uniform1f(gl.getUniformLocation(program, 'u_cameraDistance'), cameraDistance.value)
  gl.uniform1i(gl.getUniformLocation(program, 'u_iterations'), iterations.value)
  gl.uniform1f(gl.getUniformLocation(program, 'u_colorHue'), colorHue.value)
  gl.uniform3f(gl.getUniformLocation(program, 'u_lightDir'), lx, ly, lz)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  // FPS counter
  frameCount++
  if (now - lastFpsTime >= 1000) {
    fps.value = Math.round(frameCount * 1000 / (now - lastFpsTime))
    frameCount = 0
    lastFpsTime = now
  }

  const glError = gl.getError()
  if (glError !== gl.NO_ERROR) {
    glErrors.value.push(`GL error: ${glError}`)
  }

  animFrameId = requestAnimationFrame(render)
}

function onMouseDown(e: MouseEvent) {
  isDragging.value = true
  lastMouse.value = { x: e.clientX, y: e.clientY }
  lastInteraction.value = performance.now()
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const dx = e.clientX - lastMouse.value.x
  const dy = e.clientY - lastMouse.value.y
  cameraTheta.value += dx * 0.005
  cameraPhi.value = Math.max(-1.2, Math.min(1.2, cameraPhi.value + dy * 0.005))
  lastMouse.value = { x: e.clientX, y: e.clientY }
  lastInteraction.value = performance.now()
}

function onMouseUp() {
  isDragging.value = false
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  cameraDistance.value = Math.max(1.5, Math.min(20, cameraDistance.value + e.deltaY * 0.005))
  lastInteraction.value = performance.now()
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  initGL()
  animFrameId = requestAnimationFrame(render)

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)

  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(() => {
      // Resize handled in render loop
    })
    resizeObserver.observe(canvasRef.value)
  }
})

onUnmounted(() => {
  cancelAnimationFrame(animFrameId)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  resizeObserver?.disconnect()

  if (gl) {
    const ext = gl.getExtension('WEBGL_lose_context')
    ext?.loseContext()
    gl = null
  }
  program = null
})
</script>

<template>
  <div class="relative w-full">
    <!-- Error overlay -->
    <div v-if="error" class="flex h-[500px] items-center justify-center rounded-2xl border border-red-500/30 bg-red-950/20 p-8">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Canvas -->
    <div v-else class="relative">
      <canvas
        ref="canvasRef"
        class="h-[500px] w-full rounded-2xl"
        :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
        @mousedown="onMouseDown"
        @wheel.prevent="onWheel"
      />

      <!-- FPS counter -->
      <div class="absolute top-3 right-3 rounded-md bg-black/60 px-2 py-1 text-xs font-mono text-slate-300">
        {{ fps }} FPS
      </div>

      <!-- Controls -->
      <div class="absolute bottom-3 left-3 right-3 flex flex-wrap gap-4 rounded-xl bg-black/60 px-4 py-3 backdrop-blur-sm">
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">Iterations ({{ iterations }})</label>
          <input
            v-model.number="iterations"
            type="range"
            min="1"
            max="12"
            step="1"
            class="w-28 accent-[#2D95FC]"
            @input="lastInteraction = Date.now()"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">Color Hue</label>
          <input
            v-model.number="colorHue"
            type="range"
            min="0"
            max="1"
            step="0.01"
            class="w-28 accent-[#2D95FC]"
            @input="lastInteraction = Date.now()"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">Light X</label>
          <input
            v-model.number="lightAngleX"
            type="range"
            min="0"
            max="1"
            step="0.01"
            class="w-28 accent-[#2D95FC]"
            @input="lastInteraction = Date.now()"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-medium uppercase tracking-wider text-slate-400">Light Y</label>
          <input
            v-model.number="lightAngleY"
            type="range"
            min="0"
            max="1"
            step="0.01"
            class="w-28 accent-[#2D95FC]"
            @input="lastInteraction = Date.now()"
          />
        </div>
      </div>
    </div>
  </div>
</template>
