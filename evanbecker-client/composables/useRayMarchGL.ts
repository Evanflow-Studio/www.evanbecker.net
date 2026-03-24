import { ref, type Ref } from 'vue'
import { VERTEX_SHADER } from '~/utils/shaders/raymarcher.vert'
import { FRAGMENT_SHADER, buildFragmentShader } from '~/utils/shaders/raymarcher.frag'
import { POST_VERTEX, POST_FRAGMENT } from '~/utils/shaders/postprocess.frag'
import {
  ANIMATION, CAMERA_DEFAULTS, DRIFT, LIGHT, CELL_SPACING,
  FPS_UPDATE_INTERVAL_MS, SCREENSHOT_SCALE,
} from '~/utils/shaders/constants'

// === Types ===

export interface QualityPreset {
  name: string
  steps: number
  threshold: number
  maxDist: number
  warpCorrection: number
  bloom: number
  chroma: number
  vignette: number
}

export interface PlacedObject {
  x: number
  y: number
  z: number
  shape: number
}

export interface SceneDefault {
  pos: [number, number, number]
  yaw: number
  pitch: number
}

export const MAX_PLACED_OBJECTS = 8
export const SHAPE_NAMES = ['Sphere', 'Cube', 'Torus', 'Octahedron']

interface GLState {
  gl: WebGL2RenderingContext | null
  program: WebGLProgram | null
  postProgram: WebGLProgram | null
  fbo: WebGLFramebuffer | null
  fboTexture: WebGLTexture | null
  fboWidth: number
  fboHeight: number
}

interface FrameState {
  animFrameId: number
  startTime: number
  frameCount: number
  lastFpsTime: number
  accumulatedTime: number
  lastFrameTime: number
}

interface InputState {
  isDragging: boolean
  lastMouse: { x: number; y: number }
  keysDown: Set<string>
}

interface OrbitState {
  center: [number, number, number] | null
  angle: number
}

interface ScriptCache {
  fn: ((ctx: Record<string, number>) => void) | null
  lastSource: string
}

export interface RayMarchGLOptions {
  canvasRef: Ref<HTMLCanvasElement | null>
  scene: Ref<number>
  palette: Ref<number>
  iterations: Ref<number>
  lightAngleX: Ref<number>
  lightAngleY: Ref<number>
  cameraPosX: Ref<number>
  cameraPosY: Ref<number>
  cameraPosZ: Ref<number>
  cameraYaw: Ref<number>
  cameraPitch: Ref<number>
  autoRotate: Ref<boolean>
  lastInteraction: Ref<number>
  cellSpacing: Ref<number>
  wallThickness: Ref<number>
  geoPreset: Ref<number>
  animation: Ref<number>
  quality: Ref<number>
  placedObjects: Ref<PlacedObject[]>
  placeMode: Ref<boolean>
  wireframe: Ref<boolean>
  animOffset: Ref<number>
  placeShape: Ref<number>
  placeDistance: number
  timePaused: Ref<boolean>
  timeSpeed: Ref<number>
  bloomStrength: Ref<number>
  chromaticAmount: Ref<number>
  vignetteStrength: Ref<number>
  audioBass: Ref<number>
  audioMid: Ref<number>
  audioTreble: Ref<number>
  audioAmplitude: Ref<number>
  colorReact: Ref<number>
  fogDensity: Ref<number>
  paletteA: Ref<[number, number, number]>
  paletteB: Ref<[number, number, number]>
  paletteC: Ref<[number, number, number]>
  paletteD: Ref<[number, number, number]>
  customGlsl: Ref<string>
  customJs: Ref<string>
  qualityPresets: QualityPreset[]
  sceneDefaults: SceneDefault[]
  orbitDelay: number
  moveSpeed: Ref<number>
  lookSpeed: number
}

// === Composable ===

export function useRayMarchGL(options: RayMarchGLOptions) {
  const {
    canvasRef, scene, palette, iterations, lightAngleX, lightAngleY,
    cameraPosX, cameraPosY, cameraPosZ, cameraYaw, cameraPitch,
    autoRotate, lastInteraction,
    cellSpacing, wallThickness, geoPreset, animation, quality,
    placedObjects, placeMode, wireframe, animOffset, placeShape, placeDistance,
    timePaused, timeSpeed,
    bloomStrength, chromaticAmount, vignetteStrength,
    audioBass, audioMid, audioTreble, audioAmplitude, colorReact,
    fogDensity, paletteA, paletteB, paletteC, paletteD,
    customGlsl, customJs,
    qualityPresets, sceneDefaults, orbitDelay, moveSpeed, lookSpeed,
  } = options

  // Exposed reactive state
  const fps = ref(0)
  const error = ref<string | null>(null)
  const shaderCompiled = ref(false)
  const glContextCreated = ref(false)
  const glErrors = ref<string[]>([])
  const orbitProgress = ref(0)

  // Internal state objects
  const glState: GLState = {
    gl: null, program: null, postProgram: null,
    fbo: null, fboTexture: null, fboWidth: 0, fboHeight: 0,
  }

  const frame: FrameState = {
    animFrameId: 0, startTime: 0, frameCount: 0,
    lastFpsTime: 0, accumulatedTime: 0, lastFrameTime: 0,
  }

  const input: InputState = {
    isDragging: false,
    lastMouse: { x: 0, y: 0 },
    keysDown: new Set(),
  }

  const orbit: OrbitState = { center: null, angle: 0 }
  const scriptCache: ScriptCache = { fn: null, lastSource: '' }

  let resizeObserver: ResizeObserver | null = null

  // === Camera helpers ===

  function getForward(): [number, number, number] {
    const cy = Math.cos(cameraYaw.value), sy = Math.sin(cameraYaw.value)
    const cp = Math.cos(cameraPitch.value), sp = Math.sin(cameraPitch.value)
    return [-sy * cp, sp, -cy * cp]
  }

  function getRight(): [number, number, number] {
    const cy = Math.cos(cameraYaw.value), sy = Math.sin(cameraYaw.value)
    return [-cy, 0, sy]
  }

  function getPreviewPos(): [number, number, number] {
    const fw = getForward()
    return [
      cameraPosX.value + fw[0] * placeDistance,
      cameraPosY.value + fw[1] * placeDistance,
      cameraPosZ.value + fw[2] * placeDistance,
    ]
  }

  function applyMovement(dir: [number, number, number], speed: number) {
    cameraPosX.value += dir[0] * speed
    cameraPosY.value += dir[1] * speed
    cameraPosZ.value += dir[2] * speed
  }

  function isOrbitAnimation(): boolean {
    return animation.value === ANIMATION.Orbit
  }

  // === GL setup ===

  function compileShader(type: number, source: string): WebGLShader | null {
    const { gl } = glState
    if (!gl) return null
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      glErrors.value.push(gl.getShaderInfoLog(shader) || 'Unknown error')
      gl.deleteShader(shader)
      return null
    }
    return shader
  }

  function createProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    const { gl } = glState
    if (!gl) return null
    const vs = compileShader(gl.VERTEX_SHADER, vsSource)
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource)
    if (!vs || !fs) return null
    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    // Force a_position to index 0 for all programs so they share the same VAO
    gl.bindAttribLocation(prog, 0, 'a_position')
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      error.value = 'Program link failed: ' + (gl.getProgramInfoLog(prog) || '')
      return null
    }
    return prog
  }

  function ensureFBO(width: number, height: number) {
    const { gl } = glState
    if (!gl || (glState.fboWidth === width && glState.fboHeight === height && glState.fbo)) return

    if (glState.fbo) gl.deleteFramebuffer(glState.fbo)
    if (glState.fboTexture) gl.deleteTexture(glState.fboTexture)

    glState.fboTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, glState.fboTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    glState.fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, glState.fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glState.fboTexture, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    glState.fboWidth = width
    glState.fboHeight = height
  }

  function initGL() {
    const canvas = canvasRef.value
    if (!canvas) return

    glState.gl = canvas.getContext('webgl2', { antialias: false, powerPreference: 'high-performance' })
    if (!glState.gl) {
      error.value = 'WebGL2 is not supported in this browser.'
      return
    }
    glContextCreated.value = true

    glState.program = createProgram(VERTEX_SHADER, FRAGMENT_SHADER)
    if (!glState.program) {
      error.value = 'Shader compilation failed: ' + glErrors.value.join('; ')
      return
    }
    shaderCompiled.value = true

    // Fullscreen quad VAO
    const { gl } = glState
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(glState.program, 'a_position')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    // Post-processing program (optional — fails gracefully)
    glState.postProgram = createProgram(POST_VERTEX, POST_FRAGMENT)

    gl.useProgram(glState.program)
    frame.startTime = performance.now()
    frame.lastFpsTime = frame.startTime
    frame.lastFrameTime = frame.startTime
    frame.frameCount = 0
  }

  // === Camera movement ===

  function getNearestCellCenter(): [number, number, number] {
    const cs = CELL_SPACING.MIN + (CELL_SPACING.MAX - CELL_SPACING.MIN) * cellSpacing.value
    return [
      Math.round(cameraPosX.value / cs) * cs,
      Math.round(cameraPosY.value / cs) * cs,
      Math.round(cameraPosZ.value / cs) * cs,
    ]
  }

  function processOrbit() {
    if (!orbit.center) {
      orbit.center = getNearestCellCenter()
      const dx = cameraPosX.value - orbit.center[0]
      const dz = cameraPosZ.value - orbit.center[2]
      orbit.angle = Math.atan2(dx, dz)
    }

    orbit.angle += CAMERA_DEFAULTS.ORBIT_SPEED * 0.016

    cameraPosX.value = orbit.center[0] + Math.sin(orbit.angle) * CAMERA_DEFAULTS.ORBIT_RADIUS
    cameraPosZ.value = orbit.center[2] + Math.cos(orbit.angle) * CAMERA_DEFAULTS.ORBIT_RADIUS
    cameraPosY.value = orbit.center[1] + Math.sin(orbit.angle * CAMERA_DEFAULTS.ORBIT_BOB_FREQUENCY) * CAMERA_DEFAULTS.ORBIT_BOB_AMPLITUDE

    const dx = orbit.center[0] - cameraPosX.value
    const dy = orbit.center[1] - cameraPosY.value
    const dz = orbit.center[2] - cameraPosZ.value
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    cameraYaw.value = Math.atan2(-dx, -dz)
    cameraPitch.value = Math.asin(dy / dist)
  }

  const KEY_ACTIONS: Record<string, (speed: number) => void> = {
    w: (s) => applyMovement(getForward(), s),
    arrowup: (s) => applyMovement(getForward(), s),
    s: (s) => applyMovement(getForward(), -s),
    arrowdown: (s) => applyMovement(getForward(), -s),
    a: (s) => { const r = getRight(); cameraPosX.value += r[0] * s; cameraPosZ.value += r[2] * s },
    arrowleft: (s) => { const r = getRight(); cameraPosX.value += r[0] * s; cameraPosZ.value += r[2] * s },
    d: (s) => { const r = getRight(); cameraPosX.value -= r[0] * s; cameraPosZ.value -= r[2] * s },
    arrowright: (s) => { const r = getRight(); cameraPosX.value -= r[0] * s; cameraPosZ.value -= r[2] * s },
    q: (s) => { cameraPosY.value -= s },
    e: (s) => { cameraPosY.value += s },
  }

  function processKeys() {
    if (isOrbitAnimation() || input.keysDown.size === 0) return
    const speed = input.keysDown.has('shift') ? moveSpeed.value * CAMERA_DEFAULTS.SPRINT_MULTIPLIER : moveSpeed.value

    for (const key of input.keysDown) {
      const action = KEY_ACTIONS[key]
      if (action) action(speed)
    }
    lastInteraction.value = performance.now()
  }

  // === Scripting ===

  function evalCustomJs(elapsed: number) {
    const src = customJs.value.trim()
    if (!src) { scriptCache.fn = null; return }

    if (src !== scriptCache.lastSource) {
      scriptCache.lastSource = src
      try {
        scriptCache.fn = new Function('ctx', `with(ctx) { ${src} }`) as (ctx: Record<string, number>) => void
      } catch {
        scriptCache.fn = null
      }
    }

    if (!scriptCache.fn) return
    const ctx: Record<string, number> = {
      time: elapsed,
      bass: audioBass.value, mid: audioMid.value, treble: audioTreble.value, amplitude: audioAmplitude.value,
      spacing: cellSpacing.value, thickness: wallThickness.value, animOffset: animOffset.value,
      bloom: bloomStrength.value, chroma: chromaticAmount.value, vignette: vignetteStrength.value,
    }
    try {
      scriptCache.fn(ctx)
      cellSpacing.value = ctx.spacing
      wallThickness.value = ctx.thickness
      animOffset.value = ctx.animOffset
      bloomStrength.value = ctx.bloom
      chromaticAmount.value = ctx.chroma
      vignetteStrength.value = ctx.vignette
    } catch { /* ignore runtime errors */ }
  }

  function recompileWithCustomGlsl(customGlslCode?: string) {
    const { gl } = glState
    if (!gl) return false
    const newProgram = createProgram(VERTEX_SHADER, buildFragmentShader(customGlslCode))
    if (!newProgram) return false
    glState.program = newProgram
    gl.useProgram(glState.program)
    return true
  }

  // === Render pipeline ===

  function updateCamera(elapsed: number, now: number) {
    if (isOrbitAnimation()) {
      processOrbit()
    } else {
      orbit.center = null
      processKeys()
    }

    evalCustomJs(elapsed)

    const idleMs = now - lastInteraction.value
    const driftActive = autoRotate.value && !isOrbitAnimation()
    orbitProgress.value = driftActive ? Math.min(1, idleMs / orbitDelay) : 0
    if (driftActive && idleMs > orbitDelay) {
      cameraYaw.value += DRIFT.YAW_SPEED
      cameraPitch.value += Math.sin(elapsed * DRIFT.PITCH_FREQUENCY) * DRIFT.PITCH_AMPLITUDE
    }
  }

  function computeLightDir(elapsed: number): [number, number, number] {
    const lx = lightAngleX.value + elapsed * LIGHT.YAW_SPEED
    const ly = lightAngleY.value + Math.sin(elapsed * LIGHT.PITCH_FREQUENCY) * LIGHT.PITCH_AMPLITUDE
    return [
      Math.cos(lx * Math.PI * 2) * Math.cos(ly * Math.PI * 0.5),
      Math.sin(ly * Math.PI * 0.5),
      Math.sin(lx * Math.PI * 2) * Math.cos(ly * Math.PI * 0.5),
    ]
  }

  function uploadUniforms(elapsed: number, width: number, height: number) {
    const { gl, program } = glState
    if (!gl || !program) return

    const light = computeLightDir(elapsed)
    const qPreset = qualityPresets[quality.value]

    // Core
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), width, height)
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), elapsed)
    gl.uniform1f(gl.getUniformLocation(program, 'u_cameraYaw'), cameraYaw.value)
    gl.uniform1f(gl.getUniformLocation(program, 'u_cameraPitch'), cameraPitch.value)
    gl.uniform3f(gl.getUniformLocation(program, 'u_cameraPos'), cameraPosX.value, cameraPosY.value, cameraPosZ.value)
    gl.uniform1i(gl.getUniformLocation(program, 'u_iterations'), iterations.value)
    gl.uniform1i(gl.getUniformLocation(program, 'u_scene'), scene.value)
    gl.uniform1i(gl.getUniformLocation(program, 'u_palette'), palette.value)
    gl.uniform3f(gl.getUniformLocation(program, 'u_lightDir'), light[0], light[1], light[2])

    // Lattice
    gl.uniform1f(gl.getUniformLocation(program, 'u_cellSpacing'), cellSpacing.value)
    gl.uniform1f(gl.getUniformLocation(program, 'u_wallThickness'), wallThickness.value)
    gl.uniform1i(gl.getUniformLocation(program, 'u_geoPreset'), geoPreset.value)
    gl.uniform1i(gl.getUniformLocation(program, 'u_animation'), animation.value)
    gl.uniform1f(gl.getUniformLocation(program, 'u_animOffset'), animOffset.value)
    gl.uniform1i(gl.getUniformLocation(program, 'u_wireframe'), wireframe.value ? 1 : 0)

    // Quality
    gl.uniform1i(gl.getUniformLocation(program, 'u_maxSteps'), qPreset.steps)
    gl.uniform1f(gl.getUniformLocation(program, 'u_hitThreshold'), qPreset.threshold)
    gl.uniform1f(gl.getUniformLocation(program, 'u_maxDist'), qPreset.maxDist)
    gl.uniform1f(gl.getUniformLocation(program, 'u_warpCorrection'), qPreset.warpCorrection)

    // Fog
    gl.uniform1f(gl.getUniformLocation(program, 'u_fogDensity'), fogDensity.value)

    // Custom palette
    gl.uniform3f(gl.getUniformLocation(program, 'u_paletteA'), paletteA.value[0], paletteA.value[1], paletteA.value[2])
    gl.uniform3f(gl.getUniformLocation(program, 'u_paletteB'), paletteB.value[0], paletteB.value[1], paletteB.value[2])
    gl.uniform3f(gl.getUniformLocation(program, 'u_paletteC'), paletteC.value[0], paletteC.value[1], paletteC.value[2])
    gl.uniform3f(gl.getUniformLocation(program, 'u_paletteD'), paletteD.value[0], paletteD.value[1], paletteD.value[2])

    // Audio
    gl.uniform1f(gl.getUniformLocation(program, 'u_bass'), audioBass.value)
    gl.uniform1f(gl.getUniformLocation(program, 'u_mid'), audioMid.value)
    gl.uniform1f(gl.getUniformLocation(program, 'u_treble'), audioTreble.value)
    gl.uniform1f(gl.getUniformLocation(program, 'u_amplitude'), audioAmplitude.value)
    gl.uniform1f(gl.getUniformLocation(program, 'u_colorReact'), colorReact.value)

    // Placed objects
    gl.uniform1i(gl.getUniformLocation(program, 'u_localObjectCount'), placedObjects.value.length)
    for (let i = 0; i < MAX_PLACED_OBJECTS; i++) {
      const loc = gl.getUniformLocation(program, `u_localObjects[${i}]`)
      if (i < placedObjects.value.length) {
        const obj = placedObjects.value[i]
        gl.uniform4f(loc, obj.x, obj.y, obj.z, obj.shape)
      } else {
        gl.uniform4f(loc, 0, 0, 0, 0)
      }
    }

    // Preview
    const showPreview = placeMode.value ? 1 : 0
    gl.uniform1i(gl.getUniformLocation(program, 'u_showPreview'), showPreview)
    if (showPreview) {
      const pp = getPreviewPos()
      gl.uniform3f(gl.getUniformLocation(program, 'u_previewPos'), pp[0], pp[1], pp[2])
      gl.uniform1i(gl.getUniformLocation(program, 'u_previewShape'), placeShape.value)
    }
  }

  function renderPass(canvasWidth: number, canvasHeight: number) {
    const { gl, program, postProgram, fbo, fboTexture } = glState
    if (!gl || !program) return

    const hasPostFX = postProgram && (bloomStrength.value > 0 || chromaticAmount.value > 0 || vignetteStrength.value > 0)

    if (hasPostFX) {
      ensureFBO(canvasWidth, canvasHeight)
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)

      gl.useProgram(postProgram!)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, fboTexture)
      gl.uniform1i(gl.getUniformLocation(postProgram!, 'u_sceneTexture'), 0)
      gl.uniform2f(gl.getUniformLocation(postProgram!, 'u_resolution'), canvasWidth, canvasHeight)
      gl.uniform1f(gl.getUniformLocation(postProgram!, 'u_bloomStrength'), bloomStrength.value)
      gl.uniform1f(gl.getUniformLocation(postProgram!, 'u_chromaticAmount'), chromaticAmount.value)
      gl.uniform1f(gl.getUniformLocation(postProgram!, 'u_vignetteStrength'), vignetteStrength.value)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      gl.useProgram(program)
    } else {
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
  }

  function updateFrameStats(now: number) {
    frame.frameCount++
    if (now - frame.lastFpsTime >= FPS_UPDATE_INTERVAL_MS) {
      fps.value = Math.round(frame.frameCount * 1000 / (now - frame.lastFpsTime))
      frame.frameCount = 0
      frame.lastFpsTime = now
    }

    const { gl } = glState
    if (gl) {
      const glError = gl.getError()
      if (glError !== gl.NO_ERROR) {
        glErrors.value.push(`GL error: ${glError}`)
      }
    }
  }

  function render() {
    const { gl, program } = glState
    if (!gl || !program) return

    const canvas = canvasRef.value
    if (!canvas) return

    // Resize canvas to match display
    const dpr = Math.min(window.devicePixelRatio, CAMERA_DEFAULTS.MAX_DPR)
    const w = canvas.clientWidth * dpr
    const h = canvas.clientHeight * dpr
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    gl.viewport(0, 0, canvas.width, canvas.height)

    // Time
    const now = performance.now()
    if (!timePaused.value) {
      frame.accumulatedTime += (now - frame.lastFrameTime) / 1000.0 * timeSpeed.value
    }
    frame.lastFrameTime = now
    const elapsed = frame.accumulatedTime

    // Update
    updateCamera(elapsed, now)
    uploadUniforms(elapsed, canvas.width, canvas.height)
    renderPass(canvas.width, canvas.height)
    updateFrameStats(now)

    frame.animFrameId = requestAnimationFrame(render)
  }

  // === Input handlers ===

  function onMouseDown(e: MouseEvent) {
    input.isDragging = true
    input.lastMouse = { x: e.clientX, y: e.clientY }
    lastInteraction.value = performance.now()
  }

  function onMouseMove(e: MouseEvent) {
    if (!input.isDragging || isOrbitAnimation()) return
    cameraYaw.value += (e.clientX - input.lastMouse.x) * lookSpeed
    const MAX_PITCH = 1.484 // ~85 degrees — prevents gimbal lock at poles
    cameraPitch.value = Math.max(-MAX_PITCH, Math.min(MAX_PITCH,
      cameraPitch.value - (e.clientY - input.lastMouse.y) * lookSpeed))
    input.lastMouse = { x: e.clientX, y: e.clientY }
    lastInteraction.value = performance.now()
  }

  function onMouseUp() {
    input.isDragging = false
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const fw = getForward()
    const speed = -e.deltaY * 0.02
    applyMovement(fw, speed)
    lastInteraction.value = performance.now()
  }

  const MOVEMENT_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])

  function onKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase()
    if (MOVEMENT_KEYS.has(key)) {
      e.preventDefault()
      input.keysDown.add(key)
      lastInteraction.value = performance.now()
    }
    if (key === 'f' && placeMode.value) { e.preventDefault(); placeObjectAhead() }
    if (key === ' ') { e.preventDefault(); timePaused.value = !timePaused.value }
    if (key === 'p') { e.preventDefault(); captureScreenshot() }
  }

  function onKeyUp(e: KeyboardEvent) {
    input.keysDown.delete(e.key.toLowerCase())
  }

  // === Placement ===

  function placeObjectAhead() {
    if (placedObjects.value.length >= MAX_PLACED_OBJECTS) return
    const pp = getPreviewPos()
    placedObjects.value = [...placedObjects.value, { x: pp[0], y: pp[1], z: pp[2], shape: placeShape.value }]
  }

  function clearPlacedObjects() { placedObjects.value = [] }

  function undoLastPlacement() {
    if (placedObjects.value.length > 0) {
      placedObjects.value = placedObjects.value.slice(0, -1)
    }
  }

  // === Screenshot ===

  function captureScreenshot(scale = SCREENSHOT_SCALE) {
    const { gl, program } = glState
    if (!gl || !program || !canvasRef.value) return
    const canvas = canvasRef.value
    const origW = canvas.width
    const origH = canvas.height

    canvas.width = origW * scale
    canvas.height = origH * scale
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `raymarcher-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')

    canvas.width = origW
    canvas.height = origH
  }

  // === Lifecycle ===

  function start() {
    initGL()
    frame.animFrameId = requestAnimationFrame(render)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    if (canvasRef.value) {
      resizeObserver = new ResizeObserver(() => { /* handled in render loop */ })
      resizeObserver.observe(canvasRef.value)
    }
  }

  function stop() {
    cancelAnimationFrame(frame.animFrameId)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    resizeObserver?.disconnect()
    input.keysDown.clear()

    if (glState.gl) {
      const ext = glState.gl.getExtension('WEBGL_lose_context')
      ext?.loseContext()
      glState.gl = null
    }
    glState.program = null
  }

  return {
    fps, error, shaderCompiled, glContextCreated, glErrors, orbitProgress,
    gl: () => glState.gl,
    program: () => glState.program,
    onMouseDown, onWheel,
    placeObjectAhead, clearPlacedObjects, undoLastPlacement,
    captureScreenshot, recompileWithCustomGlsl,
    start, stop,
  }
}
