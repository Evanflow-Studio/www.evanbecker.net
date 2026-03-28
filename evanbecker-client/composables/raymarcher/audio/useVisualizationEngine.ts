import { ref, watch } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { genreHash, smoothOsc, smoothStep, lerp } from './vizMath'
import { createClipDetectorState, updateClipDetector } from './useClipDetector'
import {
  type AudioFeatures,
  computePalette,
  computeGeoPreset,
  computeAnimation,
  computeGeometry,
  computePostFX,
  computeAnimSpeed,
  computeCameraSpeed,
} from './vizCompute'

/**
 * Complete visual parameter set computed by the engine.
 */
export interface VisualParams {
  paletteA: [number, number, number]
  paletteB: [number, number, number]
  paletteC: [number, number, number]
  paletteD: [number, number, number]
  scene: number
  palette: number
  geoPreset: number
  cellSpacing: number
  wallThickness: number
  animation: number
  animSpeed: number
  cameraDriftSpeed: number
  cameraOrbitRadius: number
  bloomStrength: number
  chromaticAmount: number
  fogDensity: number
  zoom: number
}

// Smoothing rates
const SMOOTH_SLOW = 0.008
const SMOOTH_MED = 0.025
const SMOOTH_FAST = 0.06

// Scene transition config
const SCENE_LOCK_MIN = 6
const SCENE_SWITCH_THRESHOLD = 0.06

/** Snapshot of store state — captured on start, restored on stop */
interface StoreSnapshot {
  scene: number; palette: number; geoPreset: number; animation: number
  cellSpacing: number; wallThickness: number
  bloomStrength: number; chromaticAmount: number; fogDensity: number; zoom: number
  speed: number
  camera: { posX: number; posY: number; posZ: number; yaw: number; pitch: number; moveSpeed: number }
  customPalette: {
    a: [number, number, number]; b: [number, number, number]
    c: [number, number, number]; d: [number, number, number]
  }
}

// Safe camera positions per scene — guaranteed to be outside geometry
// Each entry: { pos: [x, y, z], yaw, pitch }
const SAFE_CAMERAS = [
  // 0: Lattice — orbit outside the lattice structure
  { pos: [0, 0.5, -3], yaw: 0, pitch: 0 },
  // 1: Mandelbulb — pulled back to see the full fractal
  { pos: [0, 0, -4], yaw: 0, pitch: 0 },
  // 2: CSG — above and back, looking down slightly
  { pos: [0, 1.5, -3.5], yaw: 0, pitch: -0.15 },
  // 3: Fractal Descent — doesn't matter much, it's a flythrough
  { pos: [0, 0, -2], yaw: 0, pitch: 0 },
]

export function useVisualizationEngine() {
  const store = useRayMarcherStore()

  const isActive = ref(false)
  const targetParams = ref<VisualParams | null>(null)
  const currentSeed = ref(0.5)

  let sessionJitter = Math.random()
  let preEngineSnapshot: StoreSnapshot | null = null
  const clipState = createClipDetectorState()
  let glRef: WebGL2RenderingContext | null = null
  let canvasRef: HTMLCanvasElement | null = null
  let cameraTime = 0
  let sceneWeights = [0.25, 0.25, 0.25, 0.25]
  let currentSceneIdx = 0
  let sceneLockTimer = 0
  let logTimer = 0

  // Smoothed audio features (prevents jitter)
  let smoothed: AudioFeatures = {
    bpm: 120, energy: 0, valence: 0.5, brightness: 0.5,
    percussiveness: 0, bass: 0, mid: 0, treble: 0, amplitude: 0, genreSeed: 0.5,
  }

  // ── Feature smoothing ──────────────────────────────────────

  function updateSmoothedFeatures() {
    const rate = 0.04
    const jt = cameraTime * 0.07 + sessionJitter * 100
    const jitter = (axis: number) => Math.sin(jt * (1.1 + axis * 0.37)) * 0.02

    smoothed.bpm = store.audio.bpm || smoothed.bpm || 120
    smoothed.energy = smoothStep(smoothed.energy, store.audio.moodEnergy + jitter(0), rate)
    smoothed.valence = smoothStep(smoothed.valence, store.audio.moodValence + jitter(1), rate)
    smoothed.brightness = smoothStep(smoothed.brightness, store.audio.brightness + jitter(2), rate)
    smoothed.percussiveness = smoothStep(smoothed.percussiveness, store.audio.percussiveness + jitter(3), rate)
    smoothed.bass = smoothStep(smoothed.bass, store.audio.bass, rate * 2)
    smoothed.mid = smoothStep(smoothed.mid, store.audio.mid, rate * 1.5)
    smoothed.treble = smoothStep(smoothed.treble, store.audio.treble, rate * 1.5)
    smoothed.amplitude = smoothStep(smoothed.amplitude, store.audio.amplitude, rate * 2)
    smoothed.genreSeed = (currentSeed.value + sessionJitter * 0.05) % 1
  }

  // ── Camera safety ───────────────────────────────────────────

  /** Move camera to a safe position for the given scene with some randomization */
  function teleportToSafePosition(sceneIdx: number) {
    const safe = SAFE_CAMERAS[sceneIdx] ?? SAFE_CAMERAS[0]
    // Add jitter so it's not the exact same spot every time
    const jx = (Math.sin(cameraTime * 1.7 + sessionJitter * 10) * 0.5)
    const jy = (Math.sin(cameraTime * 2.3 + sessionJitter * 7) * 0.3)
    const jz = (Math.sin(cameraTime * 1.1 + sessionJitter * 13) * 0.5)

    store.camera.posX = safe.pos[0] + jx
    store.camera.posY = safe.pos[1] + jy
    store.camera.posZ = safe.pos[2] + jz
    store.camera.yaw = safe.yaw + (sessionJitter - 0.5) * 0.4
    store.camera.pitch = safe.pitch

    // Reset clip detector so we don't immediately re-trigger
    clipState.consecutiveClips = 0
    clipState.isClipping = false
    clipState.timeSinceCheck = 0
  }

  // ── Scene weight management ────────────────────────────────

  // Per-scene max dwell time (seconds) — Fractal Descent is a brief spectacle
  const SCENE_MAX_DWELL = [60, 45, 45, 15] // Lattice, Mandelbulb, CSG, Fractal Descent

  function updateSceneWeights(dt: number) {
    const f = smoothed
    sceneLockTimer += dt

    // Oscillators rotate which scene is "favored" — stronger amplitude than before
    const osc0 = smoothOsc(sessionJitter, cameraTime * 0.035)
    const osc1 = smoothOsc(sessionJitter, cameraTime * 0.035 + 0.25)
    const osc2 = smoothOsc(sessionJitter, cameraTime * 0.035 + 0.5)
    const osc3 = smoothOsc(sessionJitter, cameraTime * 0.035 + 0.75)

    // Base weights — Lattice is home base (highest base), Fractal Descent is a visitor
    const raw = [
      // Lattice: home scene — most parameter variety, free camera, rhythmic
      0.35 + f.energy * 0.15 + f.mid * 0.1 + osc0 * 0.25,
      // Mandelbulb: complex organic forms — favored by brightness
      0.22 + f.brightness * 0.2 + f.percussiveness * 0.08 + osc1 * 0.25,
      // CSG: geometric, percussive — sharp beats
      0.22 + f.percussiveness * 0.2 + f.energy * 0.1 + osc2 * 0.25,
      // Fractal Descent: passive fly-through — brief spectacle only
      0.12 + (1 - f.energy) * 0.08 + f.valence * 0.05 + osc3 * 0.15,
    ]

    // Staleness penalty — the longer you stay on a scene, the more it's penalized
    // This ensures the engine MUST leave eventually, even without audio changes
    const staleness = Math.min(1, sceneLockTimer / SCENE_MAX_DWELL[currentSceneIdx])
    raw[currentSceneIdx] *= (1 - staleness * 0.5) // up to 50% penalty at max dwell

    // Smooth the weights
    for (let i = 0; i < 4; i++) {
      sceneWeights[i] = smoothStep(sceneWeights[i], raw[i], 0.04)
    }

    // Switch when a different scene dominates
    if (sceneLockTimer > SCENE_LOCK_MIN) {
      let maxWeight = 0
      let maxIdx = currentSceneIdx
      for (let i = 0; i < 4; i++) {
        if (sceneWeights[i] > maxWeight) { maxWeight = sceneWeights[i]; maxIdx = i }
      }

      // Force exit if we've exceeded max dwell time, even without threshold
      const forceExit = sceneLockTimer > SCENE_MAX_DWELL[currentSceneIdx]

      if (maxIdx !== currentSceneIdx && (forceExit || (maxWeight - sceneWeights[currentSceneIdx]) > SCENE_SWITCH_THRESHOLD)) {
        currentSceneIdx = maxIdx
        store.scene.index = maxIdx
        sceneLockTimer = 0
        // Teleport camera to a safe position for the new scene
        teleportToSafePosition(maxIdx)
        if (import.meta.dev) {
          console.log('%c[VizEngine] Scene →', 'color: #2D95FC; font-weight: bold',
            ['Lattice', 'Mandelbulb', 'CSG', 'Fractal Descent'][maxIdx],
            forceExit ? '(forced — max dwell)' : '')
        }
      }
    }
  }

  // ── Camera drift ───────────────────────────────────────────

  function updateCamera(dt: number) {
    const f = smoothed
    const camSpeed = computeCameraSpeed(f)
    const orbitR = lerp(2, 8, (1 - f.energy) * 0.6 + f.genreSeed * 0.4)
    const timeSinceInteraction = (Date.now() - store.camera.lastInteraction) / 1000

    // Clip detection — check if camera is inside geometry
    const isClipping = updateClipDetector(
      clipState, dt, glRef,
      canvasRef?.width ?? 0, canvasRef?.height ?? 0,
    )
    if (isClipping) {
      // Teleport to a safe position for the current scene
      teleportToSafePosition(currentSceneIdx)
      if (import.meta.dev) console.log('%c[VizEngine] Clip escape!', 'color: #F59E0B; font-weight: bold')
      return
    }

    if (timeSinceInteraction > 3) {
      store.camera.yaw += camSpeed * dt * (1 + f.bass * 2.5)
      const pitchRange = lerp(0.1, 0.4, f.energy)
      store.camera.pitch = smoothStep(store.camera.pitch, Math.sin(cameraTime * 0.25) * pitchRange, SMOOTH_MED)

      const wanderScale = orbitR * lerp(0.2, 0.5, f.energy)
      store.camera.posX = smoothStep(store.camera.posX,
        Math.sin(cameraTime * 0.17) * wanderScale + Math.sin(cameraTime * 0.41) * wanderScale * 0.3, SMOOTH_SLOW)
      store.camera.posY = smoothStep(store.camera.posY,
        Math.sin(cameraTime * 0.13) * wanderScale * 0.4 + Math.cos(cameraTime * 0.31) * wanderScale * 0.2, SMOOTH_SLOW)
      store.camera.posZ = smoothStep(store.camera.posZ,
        Math.cos(cameraTime * 0.15) * wanderScale + Math.sin(cameraTime * 0.37) * wanderScale * 0.25 - 2, SMOOTH_SLOW)
    }
  }

  // ── Core update ────────────────────────────────────────────

  function update(dt: number) {
    if (!isActive.value) return
    const f = smoothed

    updateSmoothedFeatures()
    updateSceneWeights(dt)
    cameraTime += dt * (0.5 + f.energy * 0.5 + f.amplitude * 0.3)

    // Compute targets from current audio
    const palette = computePalette(f)
    const geo = computeGeometry(f)
    const fx = computePostFX(f)
    const animSpeed = computeAnimSpeed(f)

    // Discrete params — evolve slowly with time-varying seed
    const driftSeed = (f.genreSeed + cameraTime * 0.002) % 1
    const driftF: AudioFeatures = { ...f, genreSeed: driftSeed }
    const targetGeo = computeGeoPreset(driftF)
    const targetAnim = computeAnimation(driftF)
    if (targetGeo !== store.lattice.geoPreset && sceneLockTimer > 5) store.lattice.geoPreset = targetGeo
    if (targetAnim !== store.lattice.animation && sceneLockTimer > 3) store.lattice.animation = targetAnim

    // Continuous params
    store.lattice.cellSpacing = smoothStep(store.lattice.cellSpacing, geo.cellSpacing + f.bass * 0.04, SMOOTH_SLOW)
    store.lattice.wallThickness = smoothStep(store.lattice.wallThickness, geo.wallThickness + f.percussiveness * 0.06, SMOOTH_SLOW)
    store.render.bloomStrength = smoothStep(store.render.bloomStrength, fx.bloom + f.amplitude * 0.2 + f.bass * 0.1, SMOOTH_FAST)
    store.render.chromaticAmount = smoothStep(store.render.chromaticAmount, fx.chromatic + f.percussiveness * 0.15, SMOOTH_FAST)
    store.render.fogDensity = smoothStep(store.render.fogDensity, fx.fog * (1 - f.energy * 0.4), SMOOTH_SLOW)
    store.render.zoom = smoothStep(store.render.zoom, fx.zoom + f.bass * 0.08, SMOOTH_MED)
    store.time.speed = smoothStep(store.time.speed, animSpeed + f.amplitude * 0.4, SMOOTH_MED)

    // Palette — continuous evolution
    const pt = cameraTime * 0.03
    store.customPalette.a = [
      smoothStep(store.customPalette.a[0], palette.a[0] + Math.sin(pt) * 0.04, SMOOTH_MED),
      smoothStep(store.customPalette.a[1], palette.a[1] + Math.sin(pt * 1.3) * 0.04, SMOOTH_MED),
      smoothStep(store.customPalette.a[2], palette.a[2] + Math.sin(pt * 0.7) * 0.04, SMOOTH_MED),
    ]
    store.customPalette.b = [
      smoothStep(store.customPalette.b[0], palette.b[0], SMOOTH_MED),
      smoothStep(store.customPalette.b[1], palette.b[1], SMOOTH_MED),
      smoothStep(store.customPalette.b[2], palette.b[2], SMOOTH_MED),
    ]
    store.customPalette.c = [
      smoothStep(store.customPalette.c[0], palette.c[0], SMOOTH_MED),
      smoothStep(store.customPalette.c[1], palette.c[1], SMOOTH_MED),
      smoothStep(store.customPalette.c[2], palette.c[2], SMOOTH_MED),
    ]
    store.customPalette.d = [
      palette.d[0] + f.bass * 0.12 + Math.sin(pt * 2) * 0.04,
      palette.d[1] + f.mid * 0.1 + Math.sin(pt * 2.5) * 0.04,
      palette.d[2] + f.treble * 0.14 + Math.sin(pt * 1.8) * 0.04,
    ]

    // Camera drift
    updateCamera(dt)

    // Periodic logging (dev only)
    if (import.meta.dev) {
      logTimer += dt
      if (logTimer > 5) {
        logTimer = 0
        console.log('%c[VizEngine]', 'color: #6B7280', {
          scene: ['Lattice', 'Mandelbulb', 'CSG', 'Fractal'][currentSceneIdx],
          energy: f.energy.toFixed(2), bpm: Math.round(f.bpm),
          bloom: store.render.bloomStrength.toFixed(3), speed: store.time.speed.toFixed(2),
        })
      }
    }
  }

  // ── Snapshot / restore ─────────────────────────────────────

  function captureSnapshot(): StoreSnapshot {
    return {
      scene: store.scene.index, palette: store.scene.palette,
      geoPreset: store.lattice.geoPreset, animation: store.lattice.animation,
      cellSpacing: store.lattice.cellSpacing, wallThickness: store.lattice.wallThickness,
      bloomStrength: store.render.bloomStrength, chromaticAmount: store.render.chromaticAmount,
      fogDensity: store.render.fogDensity, zoom: store.render.zoom,
      speed: store.time.speed, camera: { ...store.camera },
      customPalette: {
        a: [...store.customPalette.a] as [number, number, number],
        b: [...store.customPalette.b] as [number, number, number],
        c: [...store.customPalette.c] as [number, number, number],
        d: [...store.customPalette.d] as [number, number, number],
      },
    }
  }

  function restoreSnapshot(snap: StoreSnapshot) {
    store.scene.index = snap.scene; store.scene.palette = snap.palette
    store.lattice.geoPreset = snap.geoPreset; store.lattice.animation = snap.animation
    store.lattice.cellSpacing = snap.cellSpacing; store.lattice.wallThickness = snap.wallThickness
    store.render.bloomStrength = snap.bloomStrength; store.render.chromaticAmount = snap.chromaticAmount
    store.render.fogDensity = snap.fogDensity; store.render.zoom = snap.zoom
    store.time.speed = snap.speed
    store.camera.posX = snap.camera.posX; store.camera.posY = snap.camera.posY
    store.camera.posZ = snap.camera.posZ; store.camera.yaw = snap.camera.yaw
    store.camera.pitch = snap.camera.pitch; store.camera.moveSpeed = snap.camera.moveSpeed
    store.customPalette.a = snap.customPalette.a; store.customPalette.b = snap.customPalette.b
    store.customPalette.c = snap.customPalette.c; store.customPalette.d = snap.customPalette.d
  }

  // ── Start / stop ───────────────────────────────────────────

  function start() {
    preEngineSnapshot = captureSnapshot()
    isActive.value = true
    sessionJitter = Math.random()
    currentSeed.value = genreHash(store.audio.trackGenres)
    cameraTime = 0; sceneLockTimer = 0; logTimer = 0
    sceneWeights = [0.25, 0.25, 0.25, 0.25]
    currentSceneIdx = store.scene.index
    store.scene.palette = 12

    smoothed = {
      bpm: store.audio.bpm || 120, energy: store.audio.moodEnergy, valence: store.audio.moodValence,
      brightness: store.audio.brightness, percussiveness: store.audio.percussiveness,
      bass: store.audio.bass, mid: store.audio.mid, treble: store.audio.treble,
      amplitude: store.audio.amplitude, genreSeed: currentSeed.value,
    }

    if (import.meta.dev) console.log('%c[VizEngine] Started', 'color: #10B981; font-weight: bold')
  }

  function stop() {
    isActive.value = false
    targetParams.value = null
    if (preEngineSnapshot) {
      restoreSnapshot(preEngineSnapshot)
      preEngineSnapshot = null
      if (import.meta.dev) console.log('%c[VizEngine] Stopped — restored', 'color: #EF4444; font-weight: bold')
    } else {
      if (import.meta.dev) console.log('%c[VizEngine] Stopped', 'color: #EF4444; font-weight: bold')
    }
  }

  // Reseed when genre data arrives
  watch(() => store.audio.trackGenres, (genres) => {
    if (isActive.value && genres.length > 0) {
      currentSeed.value = genreHash(genres)
      smoothed.genreSeed = currentSeed.value
      if (import.meta.dev) console.log('%c[VizEngine] Reseeded:', 'color: #F59E0B; font-weight: bold', genres)
    }
  }, { deep: true })

  /** Provide the GL context so the clip detector can read pixels */
  function setGLContext(gl: WebGL2RenderingContext | null, canvas: HTMLCanvasElement | null) {
    glRef = gl
    canvasRef = canvas
  }

  return { isActive, targetParams, currentSeed, start, stop, update, setGLContext }
}
