import { type Ref } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { CAMERA_DEFAULTS } from '~/utils/shaders/constants'
import type { GLResources, OrbitTracking } from '~/types/raymarcher'
import { compileShaders } from './useShaderCompiler'
import { createInputState, processKeys, createMouseHandlers, createTouchHandlers, createKeyHandlers } from './useInputHandler'
import { createOrbitState, updateCamera, getForward, getRight, applyMovement as applyMov } from './useCameraController'
import { createFrameTiming, resetFrameTiming, uploadUniforms, renderPass, updateFrameStats } from './useRenderPipeline'
import { captureScreenshot as doScreenshot } from './useScreenshot'

const MAX_DPR = 2

function createGLResources(): GLResources {
  return {
    gl: null, program: null, postProgram: null,
    fbo: null, fboTexture: null, fboWidth: 0, fboHeight: 0,
    vao: null, quadBuffer: null,
    mainCache: {}, postCache: {},
  }
}

/**
 * Main composable — wires all sub-composables into a render loop.
 * The Pinia store owns all state; this composable owns the WebGL lifecycle.
 */
export function useRayMarchEngine(canvasRef: Ref<HTMLCanvasElement | null>) {
  const store = useRayMarcherStore()
  const lookSpeed = CAMERA_DEFAULTS.LOOK_SPEED

  // Internal (non-reactive) state
  const res = createGLResources()
  const frame = createFrameTiming()
  const input = createInputState()
  const orbit = createOrbitState()
  let resizeObserver: ResizeObserver | null = null
  let contextLost = false

  // Input handlers
  const mouse = createMouseHandlers(input, lookSpeed)
  const touch = createTouchHandlers(input, lookSpeed)
  const keys = createKeyHandlers(input, { captureScreenshot: () => doScreenshot(canvasRef.value!, res) })

  // === Render loop ===

  let contextLossCount = 0

  function onContextLost(e: Event) {
    e.preventDefault() // allows restoration
    contextLost = true
    contextLossCount++
    cancelAnimationFrame(frame.animFrameId)
    store.gl.error = null
    store.gl.shaderCompiling = true
    console.warn(`[RayMarcher] WebGL context was lost (count: ${contextLossCount}).`)

    // If context keeps getting lost, reduce quality to prevent GPU overload
    if (contextLossCount >= 2 && store.render.quality > 0) {
      store.render.quality = Math.max(0, store.render.quality - 1)
      console.warn(`[RayMarcher] Reducing quality to ${store.render.quality} to prevent further context loss.`)
    }
  }

  function onContextRestored() {
    contextLost = false
    stableFrameCount = 0
    store.gl.shaderCompiling = true
    console.log('[RayMarcher] WebGL context restored — reinitializing.')
    const canvas = canvasRef.value
    if (canvas) {
      Object.assign(res, createGLResources())
      compileShaders(canvas, res).then(() => {
        resetFrameTiming(frame)
        frame.animFrameId = requestAnimationFrame(render)
      })
    }
  }

  let stableFrameCount = 0
  let contextLostAt = 0 // timestamp when context was lost — for watchdog

  function render() {
    frame.animFrameId = requestAnimationFrame(render)

    // Watchdog: if context has been lost for >3 seconds and no restore event fired, force recovery
    if (contextLost) {
      const now = performance.now()
      if (!contextLostAt) contextLostAt = now
      if (now - contextLostAt > 3000) {
        console.warn('[RayMarcher] Context lost for >3s — forcing recovery.')
        contextLost = false
        contextLostAt = 0
        stableFrameCount = 0
        const canvas = canvasRef.value
        if (canvas) {
          Object.assign(res, createGLResources())
          compileShaders(canvas, res).then(() => resetFrameTiming(frame))
        }
      }
      return
    }
    contextLostAt = 0

    const { gl } = res
    if (!gl || !res.program) return

    const canvas = canvasRef.value
    if (!canvas) return

    // Resize — start at DPR 1 to reduce GPU pressure, scale up after context is stable
    const effectiveDpr = stableFrameCount < 60 ? 1 : Math.min(window.devicePixelRatio, MAX_DPR)
    const w = Math.floor(canvas.clientWidth * effectiveDpr)
    const h = Math.floor(canvas.clientHeight * effectiveDpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    stableFrameCount++
    gl.viewport(0, 0, canvas.width, canvas.height)

    // Time — guard against NaN from poisoned store.time.speed
    const now = performance.now()
    if (!store.time.paused) {
      const speed = Number.isFinite(store.time.speed) ? store.time.speed : 1
      const dt = (now - frame.lastFrameTime) / 1000.0
      frame.accumulatedTime += Number.isFinite(dt) ? dt * speed : 0
    }
    frame.lastFrameTime = now
    const elapsed = Number.isFinite(frame.accumulatedTime) ? frame.accumulatedTime : 0

    // Update
    processKeys(input)
    updateCamera(store, orbit)
    uploadUniforms(res, elapsed)
    renderPass(res, canvas.width, canvas.height)
    updateFrameStats(frame, now)

    // Diagnostic: log key render state every ~5s to debug black screen
    if (stableFrameCount % 300 === 1) {
      const pixel = new Uint8Array(4)
      gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
      const glErr = gl.getError()
      console.log('[RayMarcher] Render diagnostic:', {
        pixel: [pixel[0], pixel[1], pixel[2], pixel[3]],
        glError: glErr,
        canvasSize: [canvas.width, canvas.height],
        drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        hasProgram: !!res.program,
        hasPostProgram: !!res.postProgram,
        hasFBO: !!res.fbo,
        fboSize: [res.fboWidth, res.fboHeight],
        elapsed,
        scene: store.scene.index,
        fogDensity: store.render.fogDensity,
        wallThickness: store.lattice.wallThickness,
        cellSpacing: store.lattice.cellSpacing,
        zoom: store.render.zoom,
        cameraPos: [store.camera.posX, store.camera.posY, store.camera.posZ],
        bloom: store.render.bloomStrength,
        chromatic: store.render.chromaticAmount,
        preserveDrawingBuffer: gl.getContextAttributes()?.preserveDrawingBuffer,
      })
    }
  }

  // === Lifecycle ===

  async function start() {
    const canvas = canvasRef.value
    if (!canvas) return

    store.detectMobile()
    contextLost = false

    // Listen for context loss/restore BEFORE creating the context
    canvas.addEventListener('webglcontextlost', onContextLost)
    canvas.addEventListener('webglcontextrestored', onContextRestored)

    const success = await compileShaders(canvas, res)
    if (!success) return

    resetFrameTiming(frame)
    frame.animFrameId = requestAnimationFrame(render)

    // Register recompile callback so other composables can trigger GL recovery
    store.gl.requestRecompile = requestRecompile

    window.addEventListener('mousemove', mouse.onMouseMove)
    window.addEventListener('mouseup', mouse.onMouseUp)
    window.addEventListener('keydown', keys.onKeyDown)
    window.addEventListener('keyup', keys.onKeyUp)

    resizeObserver = new ResizeObserver(() => { /* handled in render */ })
    resizeObserver.observe(canvas)
  }

  function stop() {
    cancelAnimationFrame(frame.animFrameId)
    window.removeEventListener('mousemove', mouse.onMouseMove)
    window.removeEventListener('mouseup', mouse.onMouseUp)
    window.removeEventListener('keydown', keys.onKeyDown)
    window.removeEventListener('keyup', keys.onKeyUp)
    resizeObserver?.disconnect()
    input.keysDown.clear()

    const canvas = canvasRef.value
    if (canvas) {
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
    }

    if (res.gl && !contextLost) {
      if (res.vao) res.gl.deleteVertexArray(res.vao)
      if (res.quadBuffer) res.gl.deleteBuffer(res.quadBuffer)
      const ext = res.gl.getExtension('WEBGL_lose_context')
      ext?.loseContext()
    }
    Object.assign(res, createGLResources())
    contextLost = false
  }

  function captureScreenshot() {
    if (canvasRef.value) doScreenshot(canvasRef.value, res)
  }

  /** Force GL resource recreation — call after events that may invalidate the context (e.g., stopping tab capture) */
  let lastRecompileTime = 0
  function requestRecompile() {
    const canvas = canvasRef.value
    if (!canvas) return
    // Prevent recompile spam — at least 5s between recompiles
    const now = performance.now()
    if (now - lastRecompileTime < 5000) return
    lastRecompileTime = now
    console.log('[RayMarcher] Recompile requested — recreating GL resources.')
    store.gl.shaderCompiling = true
    Object.assign(res, createGLResources())
    compileShaders(canvas, res).then(() => {
      store.gl.shaderCompiling = false
      stableFrameCount = 0
      resetFrameTiming(frame)
    })
  }

  return {
    // Handlers for template bindings
    onMouseDown: mouse.onMouseDown,
    onWheel: mouse.onWheel,
    onTouchStart: touch.onTouchStart,
    onTouchMove: touch.onTouchMove,
    onTouchEnd: touch.onTouchEnd,
    // Camera helpers for joystick
    getForward: () => getForward(store),
    getRight: () => getRight(store),
    applyMovement: (dir: [number, number, number], speed: number) => applyMov(store, dir, speed),
    // Actions
    captureScreenshot,
    requestRecompile,
    start,
    stop,
    // GL access for tests
    gl: () => res.gl,
    program: () => res.program,
  }
}
