import { ref, type Ref } from 'vue'
import { VERTEX_SHADER } from '~/utils/shaders/raymarcher.vert'
import { FRAGMENT_SHADER, buildFragmentShader } from '~/utils/shaders/raymarcher.frag'
import { POST_VERTEX, POST_FRAGMENT } from '~/utils/shaders/postprocess.frag'

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
  shape: number // 0=sphere, 1=cube, 2=torus, 3=octahedron
}

export const MAX_PLACED_OBJECTS = 8
export const SHAPE_NAMES = ['Sphere', 'Cube', 'Torus', 'Octahedron']

export interface SceneDefault {
  pos: [number, number, number]
  yaw: number
  pitch: number
}

export interface RayMarchGLOptions {
  canvasRef: Ref<HTMLCanvasElement | null>
  scene: Ref<number>
  palette: Ref<number>
  iterations: Ref<number>
  lightAngleX: Ref<number>
  lightAngleY: Ref<number>
  // FPS camera
  cameraPosX: Ref<number>
  cameraPosY: Ref<number>
  cameraPosZ: Ref<number>
  cameraYaw: Ref<number>
  cameraPitch: Ref<number>
  autoRotate: Ref<boolean>
  lastInteraction: Ref<number>
  // Lattice
  cellSpacing: Ref<number>
  wallThickness: Ref<number>
  geoPreset: Ref<number>
  animation: Ref<number>
  // Quality
  quality: Ref<number>
  qualityPresets: QualityPreset[]
  // Placement
  placedObjects: Ref<PlacedObject[]>
  placeMode: Ref<boolean>
  wireframe: Ref<boolean>
  animOffset: Ref<number>
  placeShape: Ref<number>
  placeDistance: number
  // Time control
  timePaused: Ref<boolean>
  timeSpeed: Ref<number>
  // Post-processing
  bloomStrength: Ref<number>
  chromaticAmount: Ref<number>
  vignetteStrength: Ref<number>
  // Audio
  audioBass: Ref<number>
  audioMid: Ref<number>
  audioTreble: Ref<number>
  audioAmplitude: Ref<number>
  colorReact: Ref<number>
  // Scripting
  customGlsl: Ref<string>
  customJs: Ref<string>
  // Config
  sceneDefaults: SceneDefault[]
  orbitDelay: number
  moveSpeed: number
  lookSpeed: number
}

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
    customGlsl, customJs,
    qualityPresets, sceneDefaults, orbitDelay, moveSpeed, lookSpeed,
  } = options

  // Exposed state
  const fps = ref(0)
  const error = ref<string | null>(null)
  const shaderCompiled = ref(false)
  const glContextCreated = ref(false)
  const glErrors = ref<string[]>([])
  const orbitProgress = ref(0)

  // Internal GL state
  let gl: WebGL2RenderingContext | null = null
  let program: WebGLProgram | null = null
  let postProgram: WebGLProgram | null = null
  let fbo: WebGLFramebuffer | null = null
  let fboTexture: WebGLTexture | null = null
  let fboWidth = 0
  let fboHeight = 0
  let animFrameId = 0
  let startTime = 0
  let frameCount = 0
  let lastFpsTime = 0

  // Time control
  let accumulatedTime = 0
  let lastFrameTime = 0

  // Input state
  let isDragging = false
  let lastMouse = { x: 0, y: 0 }
  const keysDown = new Set<string>()
  let pointerLocked = false

  // Resize observer
  let resizeObserver: ResizeObserver | null = null

  // --- Camera helpers ---

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

  // --- GL setup ---

  function compileShader(glCtx: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
    const shader = glCtx.createShader(type)
    if (!shader) return null
    glCtx.shaderSource(shader, source)
    glCtx.compileShader(shader)
    if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
      const info = glCtx.getShaderInfoLog(shader) || 'Unknown error'
      glErrors.value.push(info)
      glCtx.deleteShader(shader)
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

    // Fullscreen quad VAO (shared by both programs)
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    // Post-processing program
    const pvs = compileShader(gl, gl.VERTEX_SHADER, POST_VERTEX)
    const pfs = compileShader(gl, gl.FRAGMENT_SHADER, POST_FRAGMENT)
    if (pvs && pfs) {
      postProgram = gl.createProgram()
      if (postProgram) {
        gl.attachShader(postProgram, pvs)
        gl.attachShader(postProgram, pfs)
        gl.linkProgram(postProgram)
        if (!gl.getProgramParameter(postProgram, gl.LINK_STATUS)) {
          postProgram = null // fall back to no post-processing
        }
      }
    }

    gl.useProgram(program)
    startTime = performance.now()
    lastFpsTime = startTime
    lastFrameTime = startTime
    frameCount = 0
  }

  function ensureFBO(width: number, height: number) {
    if (!gl || (fboWidth === width && fboHeight === height && fbo)) return
    // Clean up old FBO
    if (fbo) gl.deleteFramebuffer(fbo)
    if (fboTexture) gl.deleteTexture(fboTexture)

    fboTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, fboTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    fboWidth = width
    fboHeight = height
  }

  // --- Movement ---

  // Track the cell center we're orbiting (locked when orbit starts)
  let orbitCenter: [number, number, number] | null = null
  let orbitAngle = 0

  function isOrbitAnimation(): boolean {
    return animation.value === 5
  }

  function getNearestCellCenter(): [number, number, number] {
    const cs = 4.0 + (10.0 - 4.0) * cellSpacing.value // match shader: mix(4.0, 10.0, u_cellSpacing)
    return [
      Math.round(cameraPosX.value / cs) * cs,
      Math.round(cameraPosY.value / cs) * cs,
      Math.round(cameraPosZ.value / cs) * cs,
    ]
  }

  function processOrbit(elapsed: number) {
    if (!orbitCenter) {
      orbitCenter = getNearestCellCenter()
      // Compute initial angle from current position
      const dx = cameraPosX.value - orbitCenter[0]
      const dz = cameraPosZ.value - orbitCenter[2]
      orbitAngle = Math.atan2(dx, dz)
    }

    const orbitRadius = 2.5
    const orbitSpeed = 0.6
    orbitAngle += orbitSpeed * 0.016 // ~60fps step

    cameraPosX.value = orbitCenter[0] + Math.sin(orbitAngle) * orbitRadius
    cameraPosZ.value = orbitCenter[2] + Math.cos(orbitAngle) * orbitRadius
    cameraPosY.value = orbitCenter[1] + Math.sin(orbitAngle * 0.3) * 0.8 // gentle vertical bob

    // Look at the cell center
    const dx = orbitCenter[0] - cameraPosX.value
    const dy = orbitCenter[1] - cameraPosY.value
    const dz = orbitCenter[2] - cameraPosZ.value
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    cameraYaw.value = Math.atan2(-dx, -dz)
    cameraPitch.value = Math.asin(dy / dist)
  }

  function processKeys() {
    if (isOrbitAnimation()) return // WASD disabled during orbit
    if (keysDown.size === 0) return

    const fw = getForward()
    const rt = getRight()
    const speed = keysDown.has('shift') ? moveSpeed * 2.5 : moveSpeed

    // W/S — move forward/back
    if (keysDown.has('w') || keysDown.has('arrowup')) {
      cameraPosX.value += fw[0] * speed
      cameraPosY.value += fw[1] * speed
      cameraPosZ.value += fw[2] * speed
    }
    if (keysDown.has('s') || keysDown.has('arrowdown')) {
      cameraPosX.value -= fw[0] * speed
      cameraPosY.value -= fw[1] * speed
      cameraPosZ.value -= fw[2] * speed
    }
    // A/D — strafe left/right
    if (keysDown.has('a') || keysDown.has('arrowleft')) {
      cameraPosX.value += rt[0] * speed
      cameraPosZ.value += rt[2] * speed
    }
    if (keysDown.has('d') || keysDown.has('arrowright')) {
      cameraPosX.value -= rt[0] * speed
      cameraPosZ.value -= rt[2] * speed
    }
    // Q/E — move up/down
    if (keysDown.has('q')) {
      cameraPosY.value -= speed
    }
    if (keysDown.has('e')) {
      cameraPosY.value += speed
    }

    lastInteraction.value = performance.now()
  }

  // --- Render ---

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

    // Time control — accumulate based on speed, freeze when paused
    if (!timePaused.value) {
      accumulatedTime += (now - lastFrameTime) / 1000.0 * timeSpeed.value
    }
    lastFrameTime = now
    const elapsed = accumulatedTime

    // Camera behavior — orbit animation or FPS movement
    if (isOrbitAnimation()) {
      processOrbit(elapsed)
    } else {
      orbitCenter = null // reset when leaving orbit
      processKeys()
    }

    // Custom JS scripting — runs each frame
    evalCustomJs(elapsed)

    // Idle drift — slow kaleidoscope-like yaw rotation when idle
    const idleMs = now - lastInteraction.value
    const driftActive = autoRotate.value && !isOrbitAnimation()
    orbitProgress.value = driftActive ? Math.min(1, idleMs / orbitDelay) : 0
    if (driftActive && idleMs > orbitDelay) {
      // Gentle yaw + slight pitch oscillation for a dreamy drift
      cameraYaw.value += 0.004
      cameraPitch.value += Math.sin(elapsed * 0.3) * 0.0005
    }

    // Auto-rotating light — gentle orbit over time
    const lightX = lightAngleX.value + elapsed * 0.015
    const lightY = lightAngleY.value + Math.sin(elapsed * 0.02) * 0.1
    const lx = Math.cos(lightX * Math.PI * 2) * Math.cos(lightY * Math.PI * 0.5)
    const ly = Math.sin(lightY * Math.PI * 0.5)
    const lz = Math.sin(lightX * Math.PI * 2) * Math.cos(lightY * Math.PI * 0.5)

    // Uniforms
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height)
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), elapsed)
    gl.uniform1f(gl.getUniformLocation(program, 'u_cameraYaw'), cameraYaw.value)
    gl.uniform1f(gl.getUniformLocation(program, 'u_cameraPitch'), cameraPitch.value)
    gl.uniform3f(gl.getUniformLocation(program, 'u_cameraPos'), cameraPosX.value, cameraPosY.value, cameraPosZ.value)
    gl.uniform1i(gl.getUniformLocation(program, 'u_iterations'), iterations.value)
    gl.uniform1i(gl.getUniformLocation(program, 'u_scene'), scene.value)
    gl.uniform1i(gl.getUniformLocation(program, 'u_palette'), palette.value)
    gl.uniform3f(gl.getUniformLocation(program, 'u_lightDir'), lx, ly, lz)
    gl.uniform1f(gl.getUniformLocation(program, 'u_cellSpacing'), cellSpacing.value)
    gl.uniform1f(gl.getUniformLocation(program, 'u_wallThickness'), wallThickness.value)
    gl.uniform1i(gl.getUniformLocation(program, 'u_geoPreset'), geoPreset.value)
    gl.uniform1i(gl.getUniformLocation(program, 'u_animation'), animation.value)

    const qPreset = qualityPresets[quality.value]
    gl.uniform1i(gl.getUniformLocation(program, 'u_maxSteps'), qPreset.steps)
    gl.uniform1f(gl.getUniformLocation(program, 'u_hitThreshold'), qPreset.threshold)
    gl.uniform1f(gl.getUniformLocation(program, 'u_maxDist'), qPreset.maxDist)
    gl.uniform1f(gl.getUniformLocation(program, 'u_warpCorrection'), qPreset.warpCorrection)
    gl.uniform1i(gl.getUniformLocation(program, 'u_wireframe'), wireframe.value ? 1 : 0)
    gl.uniform1f(gl.getUniformLocation(program, 'u_animOffset'), animOffset.value)

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

    // Preview indicator
    const showPreview = placeMode.value ? 1 : 0
    gl.uniform1i(gl.getUniformLocation(program, 'u_showPreview'), showPreview)
    if (showPreview) {
      const pp = getPreviewPos()
      gl.uniform3f(gl.getUniformLocation(program, 'u_previewPos'), pp[0], pp[1], pp[2])
      gl.uniform1i(gl.getUniformLocation(program, 'u_previewShape'), placeShape.value)
    }

    // Audio uniforms
    gl.uniform1f(gl.getUniformLocation(program, 'u_bass'), audioBass.value)
    gl.uniform1f(gl.getUniformLocation(program, 'u_mid'), audioMid.value)
    gl.uniform1f(gl.getUniformLocation(program, 'u_treble'), audioTreble.value)
    gl.uniform1f(gl.getUniformLocation(program, 'u_amplitude'), audioAmplitude.value)
    gl.uniform1f(gl.getUniformLocation(program, 'u_colorReact'), colorReact.value)

    // --- Two-pass rendering ---
    const usePostProcessing = postProgram && (bloomStrength.value > 0 || chromaticAmount.value > 0 || vignetteStrength.value > 0)

    if (usePostProcessing) {
      // Pass 1: render scene to FBO
      ensureFBO(canvas.width, canvas.height)
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)

      // Pass 2: post-process FBO to screen
      gl.useProgram(postProgram!)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, fboTexture)
      gl.uniform1i(gl.getUniformLocation(postProgram!, 'u_sceneTexture'), 0)
      gl.uniform2f(gl.getUniformLocation(postProgram!, 'u_resolution'), canvas.width, canvas.height)
      gl.uniform1f(gl.getUniformLocation(postProgram!, 'u_bloomStrength'), bloomStrength.value)
      gl.uniform1f(gl.getUniformLocation(postProgram!, 'u_chromaticAmount'), chromaticAmount.value)
      gl.uniform1f(gl.getUniformLocation(postProgram!, 'u_vignetteStrength'), vignetteStrength.value)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      // Switch back to main program for next frame's uniform uploads
      gl.useProgram(program)
    } else {
      // Single pass — direct to screen
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

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

  // --- Input handlers ---

  function onMouseDown(e: MouseEvent) {
    isDragging = true
    lastMouse = { x: e.clientX, y: e.clientY }
    lastInteraction.value = performance.now()
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging || isOrbitAnimation()) return
    const dx = e.clientX - lastMouse.x
    const dy = e.clientY - lastMouse.y
    cameraYaw.value += dx * lookSpeed
    cameraPitch.value -= dy * lookSpeed // inverted for natural feel
    lastMouse = { x: e.clientX, y: e.clientY }
    lastInteraction.value = performance.now()
  }

  function onMouseUp() {
    isDragging = false
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    // Scroll = move forward/back
    const fw = getForward()
    const speed = -e.deltaY * 0.02
    cameraPosX.value += fw[0] * speed
    cameraPosY.value += fw[1] * speed
    cameraPosZ.value += fw[2] * speed
    lastInteraction.value = performance.now()
  }

  function onKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase()
    if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      e.preventDefault()
      keysDown.add(key)
      lastInteraction.value = performance.now()
    }
    // F key = place object
    if (key === 'f' && placeMode.value) {
      e.preventDefault()
      placeObjectAhead()
    }
    // Space = pause/play
    if (key === ' ') {
      e.preventDefault()
      timePaused.value = !timePaused.value
    }
    // P = screenshot
    if (key === 'p') {
      e.preventDefault()
      captureScreenshot()
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    keysDown.delete(e.key.toLowerCase())
  }

  // --- Placement ---

  function placeObjectAhead() {
    if (placedObjects.value.length >= MAX_PLACED_OBJECTS) return
    const pp = getPreviewPos()
    placedObjects.value = [...placedObjects.value, {
      x: pp[0], y: pp[1], z: pp[2],
      shape: placeShape.value,
    }]
  }

  function clearPlacedObjects() {
    placedObjects.value = []
  }

  function undoLastPlacement() {
    if (placedObjects.value.length > 0) {
      placedObjects.value = placedObjects.value.slice(0, -1)
    }
  }

  // --- Screenshot ---

  function captureScreenshot(scale = 2) {
    if (!gl || !program || !canvasRef.value) return
    const canvas = canvasRef.value
    const origW = canvas.width
    const origH = canvas.height

    // Render at higher resolution
    canvas.width = origW * scale
    canvas.height = origH * scale
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    // Download
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `raymarcher-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')

    // Restore
    canvas.width = origW
    canvas.height = origH
  }

  // --- Scripting ---

  let compiledJsFn: ((ctx: Record<string, number>) => void) | null = null
  let lastJsSource = ''

  function evalCustomJs(elapsed: number) {
    const src = customJs.value.trim()
    if (!src) { compiledJsFn = null; return }

    // Recompile only when source changes
    if (src !== lastJsSource) {
      lastJsSource = src
      try {
        compiledJsFn = new Function('ctx', `with(ctx) { ${src} }`) as (ctx: Record<string, number>) => void
      } catch {
        compiledJsFn = null
      }
    }

    if (!compiledJsFn) return
    const ctx: Record<string, number> = {
      time: elapsed,
      bass: audioBass.value,
      mid: audioMid.value,
      treble: audioTreble.value,
      amplitude: audioAmplitude.value,
      spacing: cellSpacing.value,
      thickness: wallThickness.value,
      animOffset: animOffset.value,
      bloom: bloomStrength.value,
      chroma: chromaticAmount.value,
      vignette: vignetteStrength.value,
    }
    try {
      compiledJsFn(ctx)
      cellSpacing.value = ctx.spacing
      wallThickness.value = ctx.thickness
      animOffset.value = ctx.animOffset
      bloomStrength.value = ctx.bloom
      chromaticAmount.value = ctx.chroma
      vignetteStrength.value = ctx.vignette
    } catch { /* ignore runtime errors */ }
  }

  function recompileWithCustomGlsl(customGlslCode?: string) {
    if (!gl) return false
    const newSource = buildFragmentShader(customGlslCode)
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, newSource)
    if (!fs) return false

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    if (!vs) return false

    const newProgram = gl.createProgram()
    if (!newProgram) return false
    gl.attachShader(newProgram, vs)
    gl.attachShader(newProgram, fs)
    gl.linkProgram(newProgram)
    if (!gl.getProgramParameter(newProgram, gl.LINK_STATUS)) return false

    // Success — swap programs
    program = newProgram
    gl.useProgram(program)
    return true
  }

  // --- Lifecycle ---

  function start() {
    initGL()
    animFrameId = requestAnimationFrame(render)

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
    cancelAnimationFrame(animFrameId)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    resizeObserver?.disconnect()
    keysDown.clear()

    if (gl) {
      const ext = gl.getExtension('WEBGL_lose_context')
      ext?.loseContext()
      gl = null
    }
    program = null
  }

  return {
    fps,
    error,
    shaderCompiled,
    glContextCreated,
    glErrors,
    orbitProgress,
    gl: () => gl,
    program: () => program,
    onMouseDown,
    onWheel,
    placeObjectAhead,
    clearPlacedObjects,
    undoLastPlacement,
    captureScreenshot,
    recompileWithCustomGlsl,
    start,
    stop,
  }
}
