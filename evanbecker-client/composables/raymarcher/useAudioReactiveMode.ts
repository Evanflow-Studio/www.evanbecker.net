import { ref } from 'vue'
import { useRayMarcherStore } from '~/stores/raymarcher'
import { LATTICE_PRESETS } from '~/utils/shaders/lattice-presets'
import type { MoodCategory } from '~/types/raymarcher'

// --- Energy state machine (kept for UI compatibility) ---

export type EnergyState = 'calm' | 'building' | 'intense' | 'breakdown'

// --- Mood-space preset mapping ---
// Each preset sits at a coordinate in (energy, valence) space.

interface MoodPreset {
  name: string
  energy: number
  valence: number
}

const MOOD_PRESETS: MoodPreset[] = [
  { name: 'Deep Sea',         energy: 0.2, valence: 0.6 },
  { name: 'Crystal Array',    energy: 0.1, valence: 0.3 },
  { name: 'Dreamscape',       energy: 0.4, valence: 0.7 },
  { name: 'Jellyfish',        energy: 0.5, valence: 0.8 },
  { name: 'Coral Reef',       energy: 0.3, valence: 0.5 },
  { name: 'Vortex',           energy: 0.8, valence: 0.4 },
  { name: 'Shattered Ice',    energy: 0.9, valence: 0.2 },
  { name: 'Alien Hive',       energy: 0.7, valence: 0.3 },
  { name: 'Neon Grid',        energy: 0.6, valence: 0.6 },
  { name: 'Clockwork',        energy: 0.5, valence: 0.4 },
  { name: 'Infinite Descent', energy: 0.4, valence: 0.2 },
]

// --- Mood category bias in (energy, valence) space ---

const MOOD_BIAS: Record<MoodCategory, { energy: number; valence: number }> = {
  aggressive: { energy: 0.85, valence: 0.2 },
  happy:      { energy: 0.6,  valence: 0.8 },
  sad:        { energy: 0.2,  valence: 0.3 },
  relaxed:    { energy: 0.15, valence: 0.6 },
}

// --- Beat detection constants ---

const BEAT_COOLDOWN_MS = 200

// --- Transition speed (lerp rate per second) ---

const TRANSITION_SPEED = 0.5
const PALETTE_CYCLE_SECONDS = 15
const PRESET_SWITCH_DISTANCE = 0.15 // minimum mood-space distance to trigger a preset change

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

function moodDistance(e1: number, v1: number, e2: number, v2: number): number {
  return Math.sqrt((e1 - e2) ** 2 + (v1 - v2) ** 2)
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

// --- Transition target ---

interface TransitionTarget {
  cellSpacing: number
  wallThickness: number
  animOffset: number
  lightAngleX: number
  lightAngleY: number
  geoPreset: number
  animation: number
  palette: number
  sceneIndex: number
}

/**
 * Audio-reactive autoplayer composable.
 *
 * Uses Meyda features (energy, valence, brightness, percussiveness) and
 * optional Essentia classifications (mood, BPM) to drive scene parameters
 * via a 2D mood space that maps to preset coordinates.
 */
export function useAudioReactiveMode() {
  const store = useRayMarcherStore()

  const isActive = ref(false)
  const energyState = ref<EnergyState>('calm')
  const beatCount = ref(0)

  function syncToStore() {
    store.audio.autoplayerEnergy = energyState.value
    store.audio.autoplayerBeats = beatCount.value
  }

  // Rolling average for energy tracking
  const ROLLING_WINDOW = 120
  let rollingBuffer: number[] = []
  let rollingSum = 0

  // Beat detection state
  let lastBeatTime = 0

  // Mood space tracking
  let currentMoodEnergy = 0.3
  let currentMoodValence = 0.5
  let currentPresetName = ''

  // Cumulative amplitude for palette cycling
  let cumulativeAmplitude = 0
  let lastPaletteCycleAmplitude = 0

  // Bloom spike state
  let bloomSpike = 0

  // BPM sync state
  let bpmPulsePhase = 0

  // Store snapshot for restoration
  let savedSnapshot: StoreSnapshot | null = null

  // Transition target
  let target: TransitionTarget | null = null
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
    currentPresetName = presetName
  }

  /**
   * Find the nearest preset in mood space to the given (energy, valence) point,
   * excluding the current preset to encourage variety.
   */
  function findNearestPreset(e: number, v: number): string {
    let bestName = MOOD_PRESETS[0].name
    let bestDist = Infinity

    for (const mp of MOOD_PRESETS) {
      // Slightly penalize the current preset to encourage switching
      const penalty = mp.name === currentPresetName ? 0.05 : 0
      const dist = moodDistance(e, v, mp.energy, mp.valence) + penalty
      if (dist < bestDist) {
        bestDist = dist
        bestName = mp.name
      }
    }

    return bestName
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

  // --- Energy state derivation from mood space ---

  // Hysteresis prevents rapid state flipping — require sustained change for 2+ seconds
  let stateTimer = 0
  let pendingState: EnergyState | null = null

  function deriveEnergyState(moodEnergy: number, dt: number): EnergyState {
    let rawState: EnergyState
    if (moodEnergy >= 0.65) rawState = 'intense'
    else if (moodEnergy >= 0.35) rawState = 'building'
    else if (moodEnergy >= 0.15) rawState = 'calm'
    else rawState = 'breakdown'

    // If the raw state differs from current, accumulate time
    if (rawState !== energyState.value) {
      if (rawState === pendingState) {
        stateTimer += dt
        if (stateTimer >= 2.0) {
          pendingState = null
          stateTimer = 0
          return rawState
        }
      } else {
        pendingState = rawState
        stateTimer = 0
      }
      return energyState.value // stay in current state until confirmed
    }

    // Raw state matches current — reset pending
    pendingState = null
    stateTimer = 0
    return energyState.value
  }

  // --- Beat detection (enhanced with RMS spikes from Meyda) ---

  function detectBeat(bass: number, rms: number, now: number): boolean {
    const avg = getRollingAverage()
    // Dual detection: bass threshold OR RMS spike
    const bassSpike = bass > avg * 1.3 && bass > 0.2
    const rmsSpike = rms > avg * 1.5 && rms > 0.15
    if ((bassSpike || rmsSpike) && (now - lastBeatTime) > BEAT_COOLDOWN_MS) {
      lastBeatTime = now
      beatCount.value++
      return true
    }
    return false
  }

  // --- Mood space update ---

  function updateMoodSpace(dt: number) {
    // Read Meyda-derived mood values from store
    const targetEnergy = store.audio.moodEnergy
    const targetValence = store.audio.moodValence

    // If Essentia mood is available, bias toward its classification
    let biasedEnergy = targetEnergy
    let biasedValence = targetValence
    if (store.audio.moodCategory) {
      const bias = MOOD_BIAS[store.audio.moodCategory]
      // Blend: 70% Meyda, 30% Essentia bias
      biasedEnergy = targetEnergy * 0.7 + bias.energy * 0.3
      biasedValence = targetValence * 0.7 + bias.valence * 0.3
    }

    // Smooth lerp toward target mood position
    const lerpSpeed = 1.5 * dt
    currentMoodEnergy = lerp(currentMoodEnergy, biasedEnergy, clamp(lerpSpeed, 0, 1))
    currentMoodValence = lerp(currentMoodValence, biasedValence, clamp(lerpSpeed, 0, 1))

    // Derive energy state from mood energy
    energyState.value = deriveEnergyState(currentMoodEnergy, dt)

    // Check if we should switch presets (only if mood has moved far enough)
    const currentMoodPreset = MOOD_PRESETS.find(p => p.name === currentPresetName)
    if (currentMoodPreset) {
      const dist = moodDistance(
        currentMoodEnergy, currentMoodValence,
        currentMoodPreset.energy, currentMoodPreset.valence,
      )
      if (dist > PRESET_SWITCH_DISTANCE) {
        const newPreset = findNearestPreset(currentMoodEnergy, currentMoodValence)
        if (newPreset !== currentPresetName) {
          transitionToPreset(newPreset)
        }
      }
    } else {
      // No current preset — pick nearest
      const newPreset = findNearestPreset(currentMoodEnergy, currentMoodValence)
      transitionToPreset(newPreset)
    }
  }

  // --- Per-frame modulation from Meyda features ---

  function modulatePerFrame(dt: number) {
    const { bass, mid, treble, amplitude, brightness, percussiveness } = store.audio

    // --- Geometry modulation ---
    store.lattice.cellSpacing = clamp(store.lattice.cellSpacing + bass * 0.15 * dt, 0, 1)

    // Percussiveness drives wall thickness sharpness
    const wallTarget = percussiveness > 0.5
      ? store.lattice.wallThickness + (percussiveness - 0.5) * 0.4 * dt
      : store.lattice.wallThickness + (mid - 0.5) * 0.2 * dt
    store.lattice.wallThickness = clamp(wallTarget, 0.05, 0.95)

    store.lattice.animOffset = clamp(
      store.lattice.animOffset + amplitude * 0.2 * dt,
      0, 1,
    )

    // --- Camera movement ---
    // Yaw drifts with amplitude — faster music = faster rotation
    store.camera.yaw += amplitude * 0.15 * dt

    // Pitch sways with a sine wave modulated by treble
    const pitchWave = Math.sin(cumulativeAmplitude * 2.0) * treble * 0.3
    store.camera.pitch = clamp(
      lerp(store.camera.pitch, pitchWave, dt * 1.5),
      -1.2, 1.2,
    )

    // Forward movement: bass pushes camera forward, silence drifts backward
    const forwardSpeed = (bass - 0.2) * 0.8 * dt
    const cy = Math.cos(store.camera.yaw), sy = Math.sin(store.camera.yaw)
    const cp = Math.cos(store.camera.pitch)
    store.camera.posX += -sy * cp * forwardSpeed
    store.camera.posY += Math.sin(store.camera.pitch) * forwardSpeed * 0.3
    store.camera.posZ += -cy * cp * forwardSpeed

    // On intense beats: a small lateral strafe for impact
    if (bloomSpike > 0.5) {
      const strafeDir = Math.sin(beatCount.value * 1.7) * 0.05
      store.camera.posX += -cy * strafeDir
      store.camera.posZ += sy * strafeDir
    }

    // --- Palette cycling via cumulative amplitude ---
    cumulativeAmplitude += amplitude * dt
    if (cumulativeAmplitude - lastPaletteCycleAmplitude > PALETTE_CYCLE_SECONDS) {
      lastPaletteCycleAmplitude = cumulativeAmplitude
      const totalPalettes = 12
      store.scene.palette = (store.scene.palette + 1) % totalPalettes
    }

    // --- Post-processing ---
    // Bloom: base + beat spike (decays)
    bloomSpike = Math.max(0, bloomSpike - dt * 3.0)
    store.render.bloomStrength = clamp(
      store.render.bloomStrength + bloomSpike * 0.5 * dt,
      0, 2.0,
    )

    // Chromatic aberration: driven by brightness (spectral centroid)
    store.render.chromaticAmount = clamp(
      brightness * 0.15 + treble * 0.1,
      0, 0.25,
    )

    // Fog density: spectral flatness drives fog (noisy = foggy, tonal = clear)
    const flatnessFog = store.audio.moodValence > 0.5 ? 0.0005 : 0.003
    store.render.fogDensity = clamp(
      lerp(store.render.fogDensity, flatnessFog + (1 - amplitude) * 0.002, dt * 2.0),
      0.0001, 0.01,
    )

    // --- BPM sync: pulse geometry at detected BPM ---
    if (store.audio.bpm > 0) {
      const bpmHz = store.audio.bpm / 60
      bpmPulsePhase += bpmHz * dt * Math.PI * 2
      const pulse = Math.sin(bpmPulsePhase) * 0.5 + 0.5 // 0-1
      store.lattice.animOffset = clamp(
        store.lattice.animOffset + pulse * 0.02 * dt,
        0, 1,
      )
    }
  }

  // --- Smooth preset transition ---

  function applyTransition(dt: number) {
    if (!target) return

    const t = clamp(TRANSITION_SPEED * dt, 0, 1)

    store.lattice.cellSpacing = lerp(store.lattice.cellSpacing, target.cellSpacing, t)
    store.lattice.wallThickness = lerp(store.lattice.wallThickness, target.wallThickness, t)
    store.lattice.animOffset = lerp(store.lattice.animOffset, target.animOffset, t)
    store.scene.lightAngleX = lerp(store.scene.lightAngleX, target.lightAngleX, t)
    store.scene.lightAngleY = lerp(store.scene.lightAngleY, target.lightAngleY, t)

    if (!discreteApplied) {
      store.lattice.geoPreset = target.geoPreset
      store.lattice.animation = target.animation
      store.scene.palette = target.palette
      store.scene.index = target.sceneIndex
      discreteApplied = true
    }

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
    bpmPulsePhase = 0
    currentMoodEnergy = 0.3
    currentMoodValence = 0.5
    currentPresetName = ''
    target = null

    // Start with nearest preset to initial mood
    const presetName = findNearestPreset(currentMoodEnergy, currentMoodValence)
    transitionToPreset(presetName)
  }

  function stop() {
    if (!isActive.value) return
    isActive.value = false
    target = null

    if (savedSnapshot) {
      restoreSnapshot(savedSnapshot)
      savedSnapshot = null
    }
  }

  /**
   * Called each frame from the audio analysis loop when autoplayer is active.
   */
  function update(deltaTime: number) {
    if (!isActive.value) return

    const dt = Math.min(deltaTime, 0.1)
    const now = performance.now()

    // Push amplitude into rolling buffer for beat detection baseline
    pushRolling(store.audio.amplitude)

    // Enhanced beat detection using both bass and Meyda RMS
    const rms = store.audio.moodEnergy // approximate from mood energy
    const isBeat = detectBeat(store.audio.bass, rms, now)
    if (isBeat) {
      bloomSpike = 1.0
      store.lattice.animOffset = clamp(store.lattice.animOffset + 0.05, 0, 1)
    }

    // Update mood space position and trigger preset transitions
    updateMoodSpace(dt)

    // Apply smooth preset transition
    applyTransition(dt)

    // Per-frame continuous modulation from Meyda features
    modulatePerFrame(dt)

    // Sync to store for UI
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
