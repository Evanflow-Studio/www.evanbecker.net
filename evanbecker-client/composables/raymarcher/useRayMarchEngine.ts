import { ref, type Ref } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { CAMERA_DEFAULTS } from '~/utils/shaders/constants'
import type { GLResources, FrameTiming, OrbitTracking } from '~/types/raymarcher'
import { compileShaders, recompileWithCustomGlsl as recompileGlsl } from './useShaderCompiler'
import { createInputState, processKeys, createMouseHandlers, createTouchHandlers, createKeyHandlers } from './useInputHandler'
import { createOrbitState, updateCamera, getForward, getRight, applyMovement as applyMov } from './useCameraController'
import { createFrameTiming, resetFrameTiming, uploadUniforms, renderPass, updateFrameStats } from './useRenderPipeline'
import { captureScreenshot as doScreenshot } from './useScreenshot'
import { createScriptCache, evalCustomJs } from './useCustomScripting'

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
  const orbitDelay = CAMERA_DEFAULTS.ORBIT_DELAY_MS

  // Internal (non-reactive) state
  const res = createGLResources()
  const frame = createFrameTiming()
  const input = createInputState()
  const orbit = createOrbitState()
  const scriptCache = createScriptCache()
  let resizeObserver: ResizeObserver | null = null

  // Input handlers
  const mouse = createMouseHandlers(input, lookSpeed)
  const touch = createTouchHandlers(input, lookSpeed)
  const keys = createKeyHandlers(input, { captureScreenshot: () => doScreenshot(canvasRef.value!, res) })

  // === Render loop ===

  function render() {
    frame.animFrameId = requestAnimationFrame(render)
    const { gl } = res
    if (!gl || !res.program) return

    const canvas = canvasRef.value
    if (!canvas) return

    // Resize
    const dpr = Math.min(window.devicePixelRatio, MAX_DPR)
    const w = canvas.clientWidth * dpr
    const h = canvas.clientHeight * dpr
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    gl.viewport(0, 0, canvas.width, canvas.height)

    // Time
    const now = performance.now()
    if (!store.time.paused) {
      frame.accumulatedTime += (now - frame.lastFrameTime) / 1000.0 * store.time.speed
    }
    frame.lastFrameTime = now
    const elapsed = frame.accumulatedTime

    // Update
    processKeys(input)
    evalCustomJs(scriptCache, elapsed)
    updateCamera(store, orbit, elapsed, now, orbitDelay)
    uploadUniforms(res, elapsed)
    renderPass(res, canvas.width, canvas.height)
    updateFrameStats(frame, now)
  }

  // === Lifecycle ===

  async function start() {
    const canvas = canvasRef.value
    if (!canvas) return

    store.detectMobile()

    const success = await compileShaders(canvas, res)
    if (!success) return

    resetFrameTiming(frame)
    frame.animFrameId = requestAnimationFrame(render)

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

    if (res.gl) {
      if (res.vao) res.gl.deleteVertexArray(res.vao)
      if (res.quadBuffer) res.gl.deleteBuffer(res.quadBuffer)
      const ext = res.gl.getExtension('WEBGL_lose_context')
      ext?.loseContext()
    }
    Object.assign(res, createGLResources())
  }

  function captureScreenshot() {
    if (canvasRef.value) doScreenshot(canvasRef.value, res)
  }

  function recompileWithCustomGlsl(code: string): boolean {
    if (!res.gl) return false
    return recompileGlsl(res.gl, res, code)
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
    recompileWithCustomGlsl,
    start,
    stop,
    // GL access for tests
    gl: () => res.gl,
    program: () => res.program,
  }
}
