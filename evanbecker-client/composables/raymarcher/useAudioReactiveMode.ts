import { ref } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { LATTICE_PRESETS } from '~/utils/shaders/lattice-presets'

// --- Energy state machine ---

export type EnergyState = 'calm' | 'building' | 'intense' | 'breakdown'

// --- Preset mapping per energy state (by name) ---

const ENERGY_PRESETS: Record<EnergyState, string[]> = {
  calm: ['Deep Sea', 'Crystal Array'],
  building: ['Dreamscape', 'Coral Reef'],
  intense: ['Vortex', 'Shattered Ice', 'Jellyfish', 'Alien Hive'],
  breakdown: ['Neon Grid', 'Crystal Array'],
}

// --- Beat detection constants ---

const BEAT_THRESHOLD = 0.3
const BEAT_COOLDOWN_MS = 200

// --- Energy thresholds ---

const ENERGY_INTENSE_THRESHOLD = 0.45
const ENERGY_BUILDING_THRESHOLD = 0.25
const ENERGY_CALM_THRESHOLD = 0.15
const ENERGY_HYSTERESIS_SECONDS = 3.0

// --- Transition speed (lerp rate per second) ---

const TRANSITION_SPEED = 0.5 // reaches ~63% in 2 seconds
const PALETTE_CYCLE_SECONDS = 15

// --- Helpers ---

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function findPresetIndex(name: string): number {
  return LATTICE_PRESETS.findIndex(p => p.name === name)
}

// --- Snapshot of store values to save/restore ---

interface StoreSnapshot {
  lattice: {
    presetIndex: number
    geoPreset: number
    animation: number
    cellSpacing: number
    wallThickness: number
    animOffset: number
    isCustomized: boolean
    basePresetName: string
  }
  scene: {
    index: number
    palette: number
    lightAngleX: number
    lightAngleY: number
  }
  camera: {
    yaw: number
    pitch: number
  }
  render: {
    bloomStrength: number
    chromaticAmount: number
    fogDensity: number
  }
}

// --- Transition target (the preset values we're lerping toward) ---

interface TransitionTarget {
  cellSpacing: number
  wallThickness: number
  animOffset: number
  lightAngleX: number
  lightAngleY: number
  // Integers that snap (not lerped)
  geoPreset: number
  animation: number
  palette: number
  sceneIndex: number
}

/**
 * Audio-reactive autoplayer composable.
 *
 * Analyses FFT data from the Pinia store each frame and modulates scene
 * parameters to create a music-driven visual experience. All writes go
 * through the store; the shader reads uniforms from the render pipeline.
 */
export function useAudioReactiveMode() {
  const store = useRayMarcherStore()

  const isActive = ref(false)
  // Use refs locally but also sync to store for cross-component visibility
  const energyState = ref<EnergyState>('calm')
  const beatCount = ref(0)

  function syncToStore() {
    store.audio.autoplayerEnergy = energyState.value
    store.audio.autoplayerBeats = beatCount.value
  }

  // Rolling average for energy tracking (~2 seconds at 60fps = 120 samples)
  const ROLLING_WINDOW = 120
  let rollingBuffer: number[] = []
  let rollingSum = 0

  // Beat detection state
  let lastBeatTime = 0

  // Energy state hysteresis
  let candidateState: EnergyState = 'calm'
  let candidateTimer = 0

  // Preset cycling — track last used preset per energy state
  let presetCycleIndex: Record<EnergyState, number> = {
    calm: 0,
    building: 0,
    intense: 0,
    breakdown: 0,
  }

  // Cumulative amplitude for palette cycling
  let cumulativeAmplitude = 0
  let lastPaletteCycleAmplitude = 0

  // Bloom spike state (decays over time)
  let bloomSpike = 0

  // Store snapshot for restoration
  let savedSnapshot: StoreSnapshot | null = null

  // Transition target (what we're lerping toward)
  let target: TransitionTarget | null = null
  // Whether we've snapped the discrete values for the current transition
  let discreteApplied = false

  // --- Snapshot save/restore ---

  function saveSnapshot(): StoreSnapshot {
    return {
      lattice: {
        presetIndex: store.lattice.presetIndex,
        geoPreset: store.lattice.geoPreset,
        animation: store.lattice.animation,
        cellSpacing: store.lattice.cellSpacing,
        wallThickness: store.lattice.wallThickness,
        animOffset: store.lattice.animOffset,
        isCustomized: store.lattice.isCustomized,
        basePresetName: store.lattice.basePresetName,
      },
      scene: {
        index: store.scene.index,
        palette: store.scene.palette,
        lightAngleX: store.scene.lightAngleX,
        lightAngleY: store.scene.lightAngleY,
      },
      camera: {
        yaw: store.camera.yaw,
        pitch: store.camera.pitch,
      },
      render: {
        bloomStrength: store.render.bloomStrength,
        chromaticAmount: store.render.chromaticAmount,
        fogDensity: store.render.fogDensity,
      },
    }
  }

  function restoreSnapshot(snap: StoreSnapshot) {
    store.lattice.presetIndex = snap.lattice.presetIndex
    store.lattice.geoPreset = snap.lattice.geoPreset
    store.lattice.animation = snap.lattice.animation
    store.lattice.cellSpacing = snap.lattice.cellSpacing
    store.lattice.wallThickness = snap.lattice.wallThickness
    store.lattice.animOffset = snap.lattice.animOffset
    store.lattice.isCustomized = snap.lattice.isCustomized
    store.lattice.basePresetName = snap.lattice.basePresetName
    store.scene.index = snap.scene.index
    store.scene.palette = snap.scene.palette
    store.scene.lightAngleX = snap.scene.lightAngleX
    store.scene.lightAngleY = snap.scene.lightAngleY
    store.camera.yaw = snap.camera.yaw
    store.camera.pitch = snap.camera.pitch
    store.render.bloomStrength = snap.render.bloomStrength
    store.render.chromaticAmount = snap.render.chromaticAmount
    store.render.fogDensity = snap.render.fogDensity
  }

  // --- Preset transition ---

  function transitionToPreset(presetName: string) {
    const idx = findPresetIndex(presetName)
    if (idx < 0) return
    const preset = LATTICE_PRESETS[idx]

    target = {
      cellSpacing: preset.cellSpacing,
      wallThickness: preset.wallThickness,
      animOffset: preset.animOffset,
      lightAngleX: preset.lightAngleX,
      lightAngleY: preset.lightAngleY,
      geoPreset: preset.geoPreset,
      animation: preset.animation,
      palette: preset.palette,
      sceneIndex: preset.scene !== undefined ? preset.scene : 0,
    }
    discreteApplied = false
  }

  function pickPresetForState(state: EnergyState): string {
    const names = ENERGY_PRESETS[state]
    if (!names || names.length === 0) return 'Deep Sea'

    // Pick the next preset in the cycle, skipping the current one if possible
    let idx = presetCycleIndex[state]
    const currentName = LATTICE_PRESETS[store.lattice.presetIndex]?.name
    if (names.length > 1 && names[idx] === currentName) {
      idx = (idx + 1) % names.length
    }
    presetCycleIndex[state] = (idx + 1) % names.length
    return names[idx]
  }

  // --- Rolling average ---

  function pushRolling(value: number) {
    rollingBuffer.push(value)
    rollingSum += value
    if (rollingBuffer.length > ROLLING_WINDOW) {
      rollingSum -= rollingBuffer.shift()!
    }
  }

  function getRollingAverage(): number {
    return rollingBuffer.length > 0 ? rollingSum / rollingBuffer.length : 0
  }

  // --- Energy state machine ---

  function computeCandidateState(smoothedEnergy: number): EnergyState {
    if (smoothedEnergy >= ENERGY_INTENSE_THRESHOLD) return 'intense'
    if (smoothedEnergy >= ENERGY_BUILDING_THRESHOLD) return 'building'
    if (smoothedEnergy <= ENERGY_CALM_THRESHOLD) return 'calm'
    // In between calm and building — check current state for breakdown
    // Breakdown = sharp drop from intense
    if (energyState.value === 'intense' && smoothedEnergy < ENERGY_BUILDING_THRESHOLD) return 'breakdown'
    return energyState.value // hold current
  }

  function updateEnergyState(dt: number) {
    const smoothed = getRollingAverage()
    const newCandidate = computeCandidateState(smoothed)

    if (newCandidate !== energyState.value) {
      if (newCandidate === candidateState) {
        candidateTimer += dt
        if (candidateTimer >= ENERGY_HYSTERESIS_SECONDS) {
          energyState.value = newCandidate
          candidateTimer = 0
          // Trigger preset transition
          const presetName = pickPresetForState(newCandidate)
          transitionToPreset(presetName)
        }
      } else {
        candidateState = newCandidate
        candidateTimer = 0
      }
    } else {
      candidateTimer = 0
    }
  }

  // --- Beat detection ---

  function detectBeat(bass: number, now: number): boolean {
    const avg = getRollingAverage()
    if (bass > avg * (1 + BEAT_THRESHOLD) && (now - lastBeatTime) > BEAT_COOLDOWN_MS) {
      lastBeatTime = now
      beatCount.value++
      return true
    }
    return false
  }

  // --- Per-frame modulation ---

  function modulatePerFrame(dt: number) {
    const { bass, mid, treble, amplitude } = store.audio

    // --- Continuous geometry modulation ---
    // These are additive on top of the transitioning base values
    store.lattice.cellSpacing = clamp(store.lattice.cellSpacing + bass * 0.15 * dt, 0, 1)
    store.lattice.wallThickness = clamp(
      store.lattice.wallThickness + (mid - 0.5) * 0.3 * dt,
      0.05,
      0.95,
    )
    store.lattice.animOffset = clamp(
      store.lattice.animOffset + amplitude * 0.2 * dt,
      0,
      1,
    )

    // --- Camera drift ---
    store.camera.yaw += amplitude * 0.03 * dt
    store.camera.pitch += (treble - 0.3) * 0.01 * dt
    store.camera.pitch = clamp(store.camera.pitch, -0.8, 0.8)

    // --- Palette cycling via cumulative amplitude ---
    cumulativeAmplitude += amplitude * dt
    if (cumulativeAmplitude - lastPaletteCycleAmplitude > PALETTE_CYCLE_SECONDS) {
      lastPaletteCycleAmplitude = cumulativeAmplitude
      // Shift palette forward
      const totalPalettes = 12 // number of palettes in shader
      store.scene.palette = (store.scene.palette + 1) % totalPalettes
    }

    // --- Post-processing modulation ---
    // Bloom: base from render quality + spike from beats (decays)
    bloomSpike = Math.max(0, bloomSpike - dt * 3.0) // decay over ~0.3s
    store.render.bloomStrength = clamp(
      store.render.bloomStrength + bloomSpike * 0.5 * dt,
      0,
      2.0,
    )

    // Chromatic aberration driven by treble
    store.render.chromaticAmount = clamp(treble * 0.2, 0, 0.2)

    // Fog density: louder = less fog
    store.render.fogDensity = clamp(
      lerp(store.render.fogDensity, 0.002 - amplitude * 0.0015, dt * 2.0),
      0.0001,
      0.01,
    )
  }

  // --- Smooth preset transition (lerp continuous values each frame) ---

  function applyTransition(dt: number) {
    if (!target) return

    const t = clamp(TRANSITION_SPEED * dt, 0, 1)

    // Lerp continuous values
    store.lattice.cellSpacing = lerp(store.lattice.cellSpacing, target.cellSpacing, t)
    store.lattice.wallThickness = lerp(store.lattice.wallThickness, target.wallThickness, t)
    store.lattice.animOffset = lerp(store.lattice.animOffset, target.animOffset, t)
    store.scene.lightAngleX = lerp(store.scene.lightAngleX, target.lightAngleX, t)
    store.scene.lightAngleY = lerp(store.scene.lightAngleY, target.lightAngleY, t)

    // Snap discrete values once (early in transition)
    if (!discreteApplied) {
      store.lattice.geoPreset = target.geoPreset
      store.lattice.animation = target.animation
      store.scene.palette = target.palette
      store.scene.index = target.sceneIndex
      discreteApplied = true
    }

    // Check if transition is ~complete (close enough to target)
    const dist =
      Math.abs(store.lattice.cellSpacing - target.cellSpacing) +
      Math.abs(store.lattice.wallThickness - target.wallThickness) +
      Math.abs(store.lattice.animOffset - target.animOffset)
    if (dist < 0.005) {
      target = null
    }
  }

  // --- Public API ---

  function start() {
    if (isActive.value) return
    savedSnapshot = saveSnapshot()
    isActive.value = true
    energyState.value = 'calm'
    beatCount.value = 0
    rollingBuffer = []
    rollingSum = 0
    cumulativeAmplitude = 0
    lastPaletteCycleAmplitude = 0
    lastBeatTime = 0
    bloomSpike = 0
    candidateTimer = 0
    candidateState = 'calm'
    target = null

    // Start with a calm preset
    const presetName = pickPresetForState('calm')
    transitionToPreset(presetName)
  }

  function stop() {
    if (!isActive.value) return
    isActive.value = false
    target = null

    // Restore original settings
    if (savedSnapshot) {
      restoreSnapshot(savedSnapshot)
      savedSnapshot = null
    }
  }

  /**
   * Called each frame from the audio analysis loop when autoplayer is active.
   * @param deltaTime - seconds since last frame
   */
  function update(deltaTime: number) {
    if (!isActive.value) return

    const dt = Math.min(deltaTime, 0.1) // cap to prevent huge jumps
    const now = performance.now()

    // Push current amplitude into rolling buffer
    pushRolling(store.audio.amplitude)

    // Beat detection
    const isBeat = detectBeat(store.audio.bass, now)
    if (isBeat) {
      bloomSpike = 1.0 // spike bloom on beat
      // Brief geometry pulse via animOffset
      store.lattice.animOffset = clamp(store.lattice.animOffset + 0.05, 0, 1)
    }

    // Energy state machine
    updateEnergyState(dt)

    // Apply smooth preset transition
    applyTransition(dt)

    // Per-frame continuous modulation
    modulatePerFrame(dt)

    // Sync state to store for UI visibility
    syncToStore()
  }

  return {
    isActive,
    energyState,
    beatCount,
    start,
    stop,
    update,
  }
}
