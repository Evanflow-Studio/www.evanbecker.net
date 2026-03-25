import { ref, type Ref } from 'vue'
import { VERTEX_SHADER } from '~/utils/shaders/raymarcher.vert'
import { FRAGMENT_SHADER, buildFragmentShader } from '~/utils/shaders/raymarcher.frag'
import { FRAGMENT_SHADER_FAST } from '~/utils/shaders/raymarcher-fast.frag'
import { POST_VERTEX, POST_FRAGMENT } from '~/utils/shaders/postprocess.frag'
import {
  ANIMATION, CAMERA_DEFAULTS, DRIFT, LIGHT, CELL_SPACING,
  FPS_UPDATE_INTERVAL_MS, SCREENSHOT_SCALE,
} from '~/utils/shaders/constants'

// === Types ===

type UniformCache = Record<string, WebGLUniformLocation | null>

function buildUniformCache(gl: WebGL2RenderingContext, program: WebGLProgram, names: string[]): UniformCache {
  const cache: UniformCache = {}
  for (const name of names) {
    cache[name] = gl.getUniformLocation(program, name)
  }
  return cache
}

export interface QualityPreset {
  name: string
  steps: number
  threshold: number
  maxDist: number
  warpCorrection: number
  bloom: number
  chroma: number
}

export interface SceneDefault {
  pos: [number, number, number]
  yaw: number
  pitch: number
}

interface GLState {
  gl: WebGL2RenderingContext | null
  program: WebGLProgram | null
  postProgram: WebGLProgram | null
  fbo: WebGLFramebuffer | null
  fboTexture: WebGLTexture | null
  fboWidth: number
  fboHeight: number
  mainCache: UniformCache
  postCache: UniformCache
  vao: WebGLVertexArrayObject | null
  quadBuffer: WebGLBuffer | null
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
  wireframe: Ref<boolean>
  animOffset: Ref<number>
  timePaused: Ref<boolean>
  timeSpeed: Ref<number>
  bloomStrength: Ref<number>
  chromaticAmount: Ref<number>
  fogDensity: Ref<number>
  zoom: Ref<number>
  showMinimap: Ref<boolean>
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
    wireframe, animOffset,
    timePaused, timeSpeed,
    bloomStrength, chromaticAmount,
    fogDensity, zoom, showMinimap, paletteA, paletteB, paletteC, paletteD,
    customGlsl, customJs,
    qualityPresets, sceneDefaults, orbitDelay, moveSpeed, lookSpeed,
  } = options

  // Exposed reactive state
  const fps = ref(0)
  const error = ref<string | null>(null)
  const shaderCompiled = ref(false)
  const shaderCompiling = ref(false)
  const glContextCreated = ref(false)
  const glErrors = ref<string[]>([])
  const orbitProgress = ref(0)

  // Internal state objects
  const glState: GLState = {
    gl: null, program: null, postProgram: null,
    fbo: null, fboTexture: null, fboWidth: 0, fboHeight: 0,
    mainCache: {}, postCache: {},
    vao: null, quadBuffer: null,
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

  function applyMovement(dir: [number, number, number], speed: number) {
    cameraPosX.value += dir[0] * speed
    cameraPosY.value += dir[1] * speed
    cameraPosZ.value += dir[2] * speed
  }

  function isOrbitAnimation(): boolean {
    return animation.value === ANIMATION.Orbit
  }

  // === GL setup ===

  // Submit shader for compilation — does NOT check status (non-blocking)
  function submitShader(type: number, source: string): WebGLShader | null {
    const { gl } = glState
    if (!gl) return null
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return shader
  }

  // Submit program for linking — does NOT check status (non-blocking)
  function submitProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    const { gl } = glState
    if (!gl) return null
    const vs = submitShader(gl.VERTEX_SHADER, vsSource)
    const fs = submitShader(gl.FRAGMENT_SHADER, fsSource)
    if (!vs || !fs) return null
    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.bindAttribLocation(prog, 0, 'a_position')
    gl.linkProgram(prog)
    // Do NOT check LINK_STATUS here — that blocks the main thread
    return prog
  }

  // Validate a program after GPU compilation is done (called later)
  function validateProgram(prog: WebGLProgram): boolean {
    const { gl } = glState
    if (!gl) return false
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      error.value = 'Program link failed: ' + (gl.getProgramInfoLog(prog) || '')
      return false
    }
    return true
  }

  // Synchronous createProgram for small shaders (post-process) where blocking is OK
  function createProgramSync(vsSource: string, fsSource: string): WebGLProgram | null {
    const prog = submitProgram(vsSource, fsSource)
    if (!prog) return null
    if (!validateProgram(prog)) return null
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

  const MAIN_UNIFORM_NAMES = [
    'u_resolution', 'u_time', 'u_cameraYaw', 'u_cameraPitch', 'u_cameraPos',
    'u_iterations', 'u_scene', 'u_palette', 'u_lightDir',
    'u_cellSpacing', 'u_wallThickness', 'u_geoPreset', 'u_animation',
    'u_animOffset', 'u_wireframe', 'u_maxSteps', 'u_hitThreshold',
    'u_maxDist', 'u_warpCorrection', 'u_fogDensity', 'u_zoom',
    'u_paletteA', 'u_paletteB', 'u_paletteC', 'u_paletteD',
  ]

  const POST_UNIFORM_NAMES = [
    'u_sceneTexture', 'u_resolution', 'u_bloomStrength', 'u_chromaticAmount',
  ]

  const ATTRIB_POSITION = 0 // Matches bindAttribLocation(prog, 0, 'a_position')

  function setupVAO(gl: WebGL2RenderingContext) {
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    glState.vao = gl.createVertexArray()
    gl.bindVertexArray(glState.vao)
    glState.quadBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, glState.quadBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)
    // Use hardcoded index — do NOT call getAttribLocation, it forces sync compilation
    gl.enableVertexAttribArray(ATTRIB_POSITION)
    gl.vertexAttribPointer(ATTRIB_POSITION, 2, gl.FLOAT, false, 0, 0)
  }

  function finalizeInit(gl: WebGL2RenderingContext) {
    glState.mainCache = buildUniformCache(gl, glState.program!, MAIN_UNIFORM_NAMES)

    // Post-process shader is tiny — OK to compile synchronously
    glState.postProgram = createProgramSync(POST_VERTEX, POST_FRAGMENT)
    if (glState.postProgram) {
      glState.postCache = buildUniformCache(gl, glState.postProgram, POST_UNIFORM_NAMES)
    }

    gl.useProgram(glState.program!)
    shaderCompiled.value = true
    shaderCompiling.value = false

    frame.startTime = performance.now()
    frame.lastFpsTime = frame.startTime
    frame.lastFrameTime = frame.startTime
    frame.frameCount = 0
  }

  const COMPLETION_STATUS_KHR = 0x91B1

  // Shared uniform names that exist in BOTH fast and full shaders
  const FAST_UNIFORM_NAMES = [
    'u_resolution', 'u_time', 'u_cameraYaw', 'u_cameraPitch', 'u_cameraPos',
    'u_scene', 'u_palette', 'u_lightDir',
    'u_cellSpacing', 'u_wallThickness', 'u_fogDensity', 'u_zoom',
  ]

  function initGL(): Promise<void> {
    return new Promise((resolve) => {
      const canvas = canvasRef.value
      if (!canvas) { resolve(); return }

      const t0 = performance.now()

      glState.gl = canvas.getContext('webgl2', { antialias: false, powerPreference: 'high-performance' })
      if (!glState.gl) {
        error.value = 'WebGL2 is not supported in this browser.'
        resolve(); return
      }
      glContextCreated.value = true
      shaderCompiling.value = true

      const { gl } = glState
      const parallelExt = gl.getExtension('KHR_parallel_shader_compile')

      // PHASE 1: Compile the FAST placeholder shader synchronously (<100ms)
      const fastProg = submitProgram(VERTEX_SHADER, FRAGMENT_SHADER_FAST)
      if (!fastProg || !validateProgram(fastProg)) {
        error.value = 'Fast shader failed: ' + glErrors.value.join('; ')
        shaderCompiling.value = false
        resolve(); return
      }

      glState.program = fastProg
      setupVAO(gl)
      glState.mainCache = buildUniformCache(gl, fastProg, FAST_UNIFORM_NAMES)
      gl.useProgram(fastProg)
      shaderCompiled.value = true // Start rendering with fast shader immediately

      frame.startTime = performance.now()
      frame.lastFpsTime = frame.startTime
      frame.lastFrameTime = frame.startTime
      frame.frameCount = 0

      console.log(`[RayMarcher] Fast shader ready in ${(performance.now() - t0).toFixed(0)}ms`)

      // PHASE 2: Submit the FULL shader for background compilation
      const fullProg = submitProgram(VERTEX_SHADER, FRAGMENT_SHADER)
      if (!fullProg) {
        shaderCompiling.value = false
        resolve(); return
      }

      function swapToFull() {
        if (!gl || !fullProg) return
        if (!validateProgram(fullProg)) {
          console.warn('[RayMarcher] Full shader link failed, keeping fast shader')
          shaderCompiling.value = false
          resolve(); return
        }
        glState.program = fullProg
        glState.mainCache = buildUniformCache(gl, fullProg, MAIN_UNIFORM_NAMES)

        // Post-process shader
        glState.postProgram = createProgramSync(POST_VERTEX, POST_FRAGMENT)
        if (glState.postProgram) {
          glState.postCache = buildUniformCache(gl, glState.postProgram, POST_UNIFORM_NAMES)
        }

        gl.useProgram(fullProg)
        shaderCompiling.value = false
        console.log(`[RayMarcher] Full shader ready in ${(performance.now() - t0).toFixed(0)}ms`)
        resolve()
      }

      if (parallelExt) {
        // Chrome/Edge: poll without blocking
        console.log('[RayMarcher] Compiling full shader async (KHR_parallel_shader_compile)')
        function poll() {
          if (!gl) { resolve(); return }
          if (gl.getProgramParameter(fullProg!, COMPLETION_STATUS_KHR)) {
            swapToFull()
          } else {
            requestAnimationFrame(poll)
          }
        }
        requestAnimationFrame(poll)
      } else {
        // Firefox/Safari: no parallel compile. Defer blocking check by ~2 seconds
        // so the fast shader renders several frames first.
        console.log('[RayMarcher] Compiling full shader deferred (no parallel ext)')
        setTimeout(swapToFull, 2000)
      }
    })
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
      spacing: cellSpacing.value, thickness: wallThickness.value, animOffset: animOffset.value,
      bloom: bloomStrength.value, chroma: chromaticAmount.value,
    }
    try {
      scriptCache.fn(ctx)
      cellSpacing.value = ctx.spacing
      wallThickness.value = ctx.thickness
      animOffset.value = ctx.animOffset
      bloomStrength.value = ctx.bloom
      chromaticAmount.value = ctx.chroma
    } catch { /* ignore runtime errors */ }
  }

  function recompileWithCustomGlsl(customGlslCode?: string) {
    const { gl } = glState
    if (!gl) return false
    const newProgram = submitProgram(VERTEX_SHADER, buildFragmentShader(customGlslCode))
    if (!newProgram || !validateProgram(newProgram)) return false
    glState.program = newProgram
    glState.mainCache = buildUniformCache(gl, newProgram, MAIN_UNIFORM_NAMES)
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
    const { gl, program, mainCache } = glState
    if (!gl || !program) return

    const light = computeLightDir(elapsed)
    const qPreset = qualityPresets[quality.value]

    // Core
    gl.uniform2f(mainCache['u_resolution'], width, height)
    gl.uniform1f(mainCache['u_time'], elapsed)
    gl.uniform1f(mainCache['u_cameraYaw'], cameraYaw.value)
    gl.uniform1f(mainCache['u_cameraPitch'], cameraPitch.value)
    gl.uniform3f(mainCache['u_cameraPos'], cameraPosX.value, cameraPosY.value, cameraPosZ.value)
    gl.uniform1i(mainCache['u_iterations'], iterations.value)
    gl.uniform1i(mainCache['u_scene'], scene.value)
    gl.uniform1i(mainCache['u_palette'], palette.value)
    gl.uniform3f(mainCache['u_lightDir'], light[0], light[1], light[2])

    // Lattice
    gl.uniform1f(mainCache['u_cellSpacing'], cellSpacing.value)
    gl.uniform1f(mainCache['u_wallThickness'], wallThickness.value)
    gl.uniform1i(mainCache['u_geoPreset'], geoPreset.value)
    gl.uniform1i(mainCache['u_animation'], animation.value)
    gl.uniform1f(mainCache['u_animOffset'], animOffset.value)
    gl.uniform1i(mainCache['u_wireframe'], wireframe.value ? 1 : 0)

    // Quality
    gl.uniform1i(mainCache['u_maxSteps'], qPreset.steps)
    gl.uniform1f(mainCache['u_hitThreshold'], qPreset.threshold)
    gl.uniform1f(mainCache['u_maxDist'], qPreset.maxDist)
    gl.uniform1f(mainCache['u_warpCorrection'], qPreset.warpCorrection)

    // Fog & zoom
    gl.uniform1f(mainCache['u_fogDensity'], fogDensity.value)
    gl.uniform1f(mainCache['u_zoom'], zoom.value)
    // minimap removed for shader compilation performance

    // Custom palette
    gl.uniform3f(mainCache['u_paletteA'], paletteA.value[0], paletteA.value[1], paletteA.value[2])
    gl.uniform3f(mainCache['u_paletteB'], paletteB.value[0], paletteB.value[1], paletteB.value[2])
    gl.uniform3f(mainCache['u_paletteC'], paletteC.value[0], paletteC.value[1], paletteC.value[2])
    gl.uniform3f(mainCache['u_paletteD'], paletteD.value[0], paletteD.value[1], paletteD.value[2])

  }

  function renderPass(canvasWidth: number, canvasHeight: number) {
    const { gl, program, postProgram, postCache, fbo, fboTexture } = glState
    if (!gl || !program) return

    const hasPostFX = postProgram && (bloomStrength.value > 0 || chromaticAmount.value > 0)

    if (hasPostFX) {
      ensureFBO(canvasWidth, canvasHeight)
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)

      gl.useProgram(postProgram!)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, fboTexture)
      gl.uniform1i(postCache['u_sceneTexture'], 0)
      gl.uniform2f(postCache['u_resolution'], canvasWidth, canvasHeight)
      gl.uniform1f(postCache['u_bloomStrength'], bloomStrength.value)
      gl.uniform1f(postCache['u_chromaticAmount'], chromaticAmount.value)
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
    // Always re-schedule first — never let the loop die
    frame.animFrameId = requestAnimationFrame(render)

    const { gl, program } = glState
    if (!gl || !program) return

    const canvas = canvasRef.value
    if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) return

    // Resize canvas to match display
    const dpr = Math.min(window.devicePixelRatio, CAMERA_DEFAULTS.MAX_DPR)
    const w = Math.round(canvas.clientWidth * dpr)
    const h = Math.round(canvas.clientHeight * dpr)
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
    // Scroll zooms FOV (telephoto). Hold Shift to move forward/back instead.
    if (e.shiftKey) {
      const fw = getForward()
      const speed = -e.deltaY * 0.02
      applyMovement(fw, speed)
    } else {
      const zoomFactor = 1 - e.deltaY * 0.001
      zoom.value = Math.max(1.0, Math.min(10.0, zoom.value * zoomFactor))
    }
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
    if (key === ' ') { e.preventDefault(); timePaused.value = !timePaused.value }
    if (key === 'p') { e.preventDefault(); captureScreenshot() }
  }

  function onKeyUp(e: KeyboardEvent) {
    input.keysDown.delete(e.key.toLowerCase())
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
    gl.uniform2f(glState.mainCache['u_resolution'], canvas.width, canvas.height)
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

  async function start() {
    // Register input handlers immediately (responsive even while compiling)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    if (canvasRef.value) {
      resizeObserver = new ResizeObserver(() => { /* handled in render loop */ })
      resizeObserver.observe(canvasRef.value)
    }

    // Init GL asynchronously — browser stays responsive during GPU compilation
    await initGL()

    // Only start render loop after shader is compiled
    if (shaderCompiled.value) {
      frame.animFrameId = requestAnimationFrame(render)
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
      const { gl } = glState
      if (glState.vao) gl.deleteVertexArray(glState.vao)
      if (glState.quadBuffer) gl.deleteBuffer(glState.quadBuffer)
      glState.vao = null
      glState.quadBuffer = null
      const ext = gl.getExtension('WEBGL_lose_context')
      ext?.loseContext()
      glState.gl = null
    }
    glState.program = null
  }

  return {
    fps, error, shaderCompiled, shaderCompiling, glContextCreated, glErrors, orbitProgress,
    gl: () => glState.gl,
    program: () => glState.program,
    onMouseDown, onWheel,
    captureScreenshot, recompileWithCustomGlsl,
    start, stop,
  }
}
