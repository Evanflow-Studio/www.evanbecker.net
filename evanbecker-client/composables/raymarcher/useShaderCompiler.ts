import { VERTEX_SHADER } from '~/utils/shaders/raymarcher.vert'
import { FRAGMENT_SHADER } from '~/utils/shaders/raymarcher.frag'
import { FRAGMENT_SHADER_FAST } from '~/utils/shaders/raymarcher-fast.frag'
import { POST_VERTEX, POST_FRAGMENT } from '~/utils/shaders/postprocess.frag'
import type { GLResources, UniformCache } from '~/types/raymarcher'
import { useRayMarcherStore } from '~/stores/raymarcher'

const ATTRIB_POSITION = 0
const COMPLETION_STATUS_KHR = 0x91B1

export const MAIN_UNIFORM_NAMES = [
  'u_resolution', 'u_time', 'u_cameraYaw', 'u_cameraPitch', 'u_cameraPos',
  'u_iterations', 'u_scene', 'u_palette', 'u_lightDir',
  'u_cellSpacing', 'u_wallThickness', 'u_geoPreset', 'u_animation',
  'u_animOffset', 'u_maxSteps', 'u_hitThreshold',
  'u_maxDist', 'u_warpCorrection', 'u_fogDensity', 'u_zoom',
  'u_paletteA', 'u_paletteB', 'u_paletteC', 'u_paletteD',
  'u_bass', 'u_mid', 'u_treble', 'u_amplitude',
]

export const FAST_UNIFORM_NAMES = [
  'u_resolution', 'u_time', 'u_cameraYaw', 'u_cameraPitch', 'u_cameraPos',
  'u_scene', 'u_palette', 'u_lightDir',
  'u_cellSpacing', 'u_wallThickness', 'u_fogDensity', 'u_zoom',
]

const POST_UNIFORM_NAMES = [
  'u_sceneTexture', 'u_resolution', 'u_bloomStrength', 'u_chromaticAmount',
]

export function buildUniformCache(gl: WebGL2RenderingContext, program: WebGLProgram, names: string[]): UniformCache {
  const cache: UniformCache = {}
  for (const name of names) cache[name] = gl.getUniformLocation(program, name)
  return cache
}

function submitShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

function submitProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram | null {
  const vs = submitShader(gl, gl.VERTEX_SHADER, vsSource)
  const fs = submitShader(gl, gl.FRAGMENT_SHADER, fsSource)
  if (!vs || !fs) return null
  const prog = gl.createProgram()
  if (!prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.bindAttribLocation(prog, ATTRIB_POSITION, 'a_position')
  gl.linkProgram(prog)
  return prog
}

function validateProgram(gl: WebGL2RenderingContext, prog: WebGLProgram): boolean {
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Shader link failed:', gl.getProgramInfoLog(prog) || '')
    return false
  }
  return true
}

function createProgramSync(gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram | null {
  const prog = submitProgram(gl, vsSource, fsSource)
  if (!prog || !validateProgram(gl, prog)) return null
  return prog
}

export function setupVAO(gl: WebGL2RenderingContext, res: GLResources) {
  const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  res.vao = gl.createVertexArray()
  gl.bindVertexArray(res.vao)
  res.quadBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, res.quadBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(ATTRIB_POSITION)
  gl.vertexAttribPointer(ATTRIB_POSITION, 2, gl.FLOAT, false, 0, 0)
}

function buildPostProgram(gl: WebGL2RenderingContext, res: GLResources) {
  res.postProgram = createProgramSync(gl, POST_VERTEX, POST_FRAGMENT)
  if (res.postProgram) {
    res.postCache = buildUniformCache(gl, res.postProgram, POST_UNIFORM_NAMES)
  }
}

function swapToFullShader(gl: WebGL2RenderingContext, res: GLResources, fullProg: WebGLProgram, t0: number) {
  const store = useRayMarcherStore()
  res.program = fullProg
  res.mainCache = buildUniformCache(gl, fullProg, MAIN_UNIFORM_NAMES)
  buildPostProgram(gl, res)
  gl.useProgram(fullProg)
  store.gl.shaderCompiling = false
  console.log(`[RayMarcher] Full shader ready in ${(performance.now() - t0).toFixed(0)}ms`)
}

/**
 * Initialize WebGL context and compile shaders.
 *
 * Phase 1: Submit fast placeholder shader (non-blocking).
 * Phase 2: Submit full shader — poll on Chrome, deferred sync on Firefox.
 * The "Compiling shader..." overlay stays until the full shader is ready.
 */
export async function compileShaders(
  canvas: HTMLCanvasElement,
  res: GLResources,
): Promise<boolean> {
  const store = useRayMarcherStore()
  const t0 = performance.now()

  const gl = canvas.getContext('webgl2', { antialias: false, powerPreference: 'high-performance' })
  if (!gl) {
    store.gl.error = 'WebGL2 is not supported in this browser.'
    return false
  }
  res.gl = gl
  store.gl.contextCreated = true
  store.gl.shaderCompiling = true

  const parallelExt = gl.getExtension('KHR_parallel_shader_compile')

  // Phase 1: Fast shader — no validation (non-blocking)
  const fastProg = submitProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER_FAST)
  if (!fastProg) {
    store.gl.error = 'Fast shader submission failed'
    store.gl.shaderCompiling = false
    return false
  }

  res.program = fastProg
  setupVAO(gl, res)
  gl.useProgram(fastProg)
  res.mainCache = buildUniformCache(gl, fastProg, FAST_UNIFORM_NAMES)
  store.gl.shaderCompiled = true

  console.log(`[RayMarcher] Fast shader submitted in ${(performance.now() - t0).toFixed(0)}ms`)

  // Phase 2: Full shader
  return new Promise<boolean>((resolve) => {
    if (parallelExt) {
      // Chrome/Edge: non-blocking poll
      const fullProg = submitProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)
      if (!fullProg) { store.gl.shaderCompiling = false; resolve(true); return }

      function poll() {
        if (!gl || !fullProg) { resolve(true); return }
        if (gl.getProgramParameter(fullProg, COMPLETION_STATUS_KHR)) {
          if (validateProgram(gl, fullProg)) {
            swapToFullShader(gl, res, fullProg, t0)
          } else {
            store.gl.shaderCompiling = false
          }
          resolve(true)
        } else {
          requestAnimationFrame(poll)
        }
      }
      requestAnimationFrame(poll)
    } else {
      // Firefox: no parallel compile support. Defer the full shader
      // compilation to give the fast shader time to render several frames.
      // This keeps the GPU watchdog happy (it sees frames being produced)
      // before we block with the full compile.
      // Resolve immediately so the render loop starts with the fast shader.
      resolve(true)

      // After 3 seconds of fast-shader rendering, compile the full shader
      setTimeout(() => {
        if (!gl || gl.isContextLost()) return
        console.log('[RayMarcher] Firefox: starting deferred full shader compile...')
        const fullProg = submitProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)
        if (fullProg && validateProgram(gl, fullProg)) {
          swapToFullShader(gl, res, fullProg, t0)
        } else {
          store.gl.shaderCompiling = false
          console.warn('[RayMarcher] Full shader compilation failed, staying on fast shader')
        }
      }, 3000)
    }
  })
}

