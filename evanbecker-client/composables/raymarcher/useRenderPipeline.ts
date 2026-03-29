import { useRayMarcherStore, QUALITY_PRESETS } from '~/stores/raymarcher'
import { LIGHT, FPS_UPDATE_INTERVAL_MS, CAMERA_DEFAULTS } from '~/utils/shaders/constants'
import type { GLResources, FrameTiming } from '~/types/raymarcher'

type Vec3 = [number, number, number]

export function createFrameTiming(): FrameTiming {
  return {
    animFrameId: 0,
    startTime: 0,
    frameCount: 0,
    lastFpsTime: 0,
    accumulatedTime: 0,
    lastFrameTime: 0,
  }
}

export function resetFrameTiming(frame: FrameTiming) {
  const now = performance.now()
  frame.startTime = now
  frame.lastFpsTime = now
  frame.lastFrameTime = now
  frame.frameCount = 0
}

function computeLightDir(store: ReturnType<typeof useRayMarcherStore>, elapsed: number): Vec3 {
  const lx = store.scene.lightAngleX + elapsed * LIGHT.YAW_SPEED
  const ly = store.scene.lightAngleY + Math.sin(elapsed * LIGHT.PITCH_FREQUENCY) * LIGHT.PITCH_AMPLITUDE
  return [
    Math.cos(lx * Math.PI * 2) * Math.cos(ly * Math.PI * 0.5),
    Math.sin(ly * Math.PI * 0.5),
    Math.sin(lx * Math.PI * 2) * Math.cos(ly * Math.PI * 0.5),
  ]
}

export function uploadUniforms(res: GLResources, elapsed: number) {
  const { gl, mainCache } = res
  if (!gl) return

  const store = useRayMarcherStore()
  const light = computeLightDir(store, elapsed)
  const qPreset = QUALITY_PRESETS[store.render.quality]

  gl.uniform2f(mainCache['u_resolution'], gl.drawingBufferWidth, gl.drawingBufferHeight)
  gl.uniform1f(mainCache['u_time'], elapsed)
  gl.uniform1f(mainCache['u_cameraYaw'], store.camera.yaw)
  gl.uniform1f(mainCache['u_cameraPitch'], store.camera.pitch)
  gl.uniform3f(mainCache['u_cameraPos'], store.camera.posX, store.camera.posY, store.camera.posZ)
  gl.uniform1i(mainCache['u_iterations'], store.scene.iterations)
  gl.uniform1i(mainCache['u_scene'], store.scene.index)
  gl.uniform1i(mainCache['u_palette'], store.scene.palette)
  gl.uniform3f(mainCache['u_lightDir'], light[0], light[1], light[2])

  gl.uniform1f(mainCache['u_cellSpacing'], store.lattice.cellSpacing)
  gl.uniform1f(mainCache['u_wallThickness'], store.lattice.wallThickness)
  gl.uniform1i(mainCache['u_geoPreset'], store.lattice.geoPreset)
  gl.uniform1i(mainCache['u_animation'], store.lattice.animation)
  gl.uniform1f(mainCache['u_animOffset'], store.lattice.animOffset)
  gl.uniform1i(mainCache['u_maxSteps'], store.effectiveSteps)
  gl.uniform1f(mainCache['u_hitThreshold'], qPreset.threshold)
  gl.uniform1f(mainCache['u_maxDist'], qPreset.maxDist)
  gl.uniform1f(mainCache['u_warpCorrection'], qPreset.warpCorrection)
  gl.uniform1f(mainCache['u_fogDensity'], store.render.fogDensity)
  gl.uniform1f(mainCache['u_zoom'], store.render.zoom)

  gl.uniform3fv(mainCache['u_paletteA'], store.customPalette.a)
  gl.uniform3fv(mainCache['u_paletteB'], store.customPalette.b)
  gl.uniform3fv(mainCache['u_paletteC'], store.customPalette.c)
  gl.uniform3fv(mainCache['u_paletteD'], store.customPalette.d)

  // Audio reactivity (defaults to 0 when not capturing)
  gl.uniform1f(mainCache['u_bass'], store.audio.bass)
  gl.uniform1f(mainCache['u_mid'], store.audio.mid)
  gl.uniform1f(mainCache['u_treble'], store.audio.treble)
  gl.uniform1f(mainCache['u_amplitude'], store.audio.amplitude)
}

export function ensureFBO(res: GLResources, width: number, height: number) {
  const { gl } = res
  if (!gl || (res.fboWidth === width && res.fboHeight === height && res.fbo)) return

  if (res.fbo) gl.deleteFramebuffer(res.fbo)
  if (res.fboTexture) gl.deleteTexture(res.fboTexture)

  res.fboTexture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, res.fboTexture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  res.fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, res.fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, res.fboTexture, 0)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  res.fboWidth = width
  res.fboHeight = height
}

export function renderPass(res: GLResources, canvasWidth: number, canvasHeight: number) {
  const { gl, program, postProgram, postCache } = res
  if (!gl || !program) return

  const store = useRayMarcherStore()
  const hasPostFX = postProgram && (store.render.bloomStrength > 0 || store.render.chromaticAmount > 0)

  if (hasPostFX) {
    ensureFBO(res, canvasWidth, canvasHeight)
    // Read fbo/fboTexture AFTER ensureFBO — it may have just recreated them
    gl.bindFramebuffer(gl.FRAMEBUFFER, res.fbo)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    gl.useProgram(postProgram!)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, res.fboTexture)
    gl.uniform1i(postCache['u_sceneTexture'], 0)
    gl.uniform2f(postCache['u_resolution'], canvasWidth, canvasHeight)
    gl.uniform1f(postCache['u_bloomStrength'], store.render.bloomStrength)
    gl.uniform1f(postCache['u_chromaticAmount'], store.render.chromaticAmount)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    gl.useProgram(program)
  } else {
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}

export function updateFrameStats(frame: FrameTiming, now: number) {
  const store = useRayMarcherStore()
  frame.frameCount++
  if (now - frame.lastFpsTime >= FPS_UPDATE_INTERVAL_MS) {
    store.gl.fps = Math.round(frame.frameCount * 1000 / (now - frame.lastFpsTime))
    frame.frameCount = 0
    frame.lastFpsTime = now
  }
}
