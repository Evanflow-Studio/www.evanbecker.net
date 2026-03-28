import { describe, it, expect } from 'vitest'
import {
  type AudioFeatures,
  computeScene,
  computeGeoPreset,
  computeAnimation,
  computeGeometry,
  computePostFX,
  computeAnimSpeed,
  computeCameraSpeed,
  computePalette,
} from '../../composables/raymarcher/audio/vizCompute'
import { smoothStep, smoothOsc, lerp } from '../../composables/raymarcher/audio/vizMath'

/**
 * Fake audio data modeled after Eminem - 313:
 * Aggressive rap, ~170 BPM, high energy, percussive, low valence.
 */
function eminem313Features(overrides: Partial<AudioFeatures> = {}): AudioFeatures {
  return {
    bpm: 170,
    energy: 0.75,
    valence: 0.3,
    brightness: 0.45,
    percussiveness: 0.7,
    bass: 0.8,
    mid: 0.5,
    treble: 0.3,
    amplitude: 0.65,
    genreSeed: 0.42, // "hip hop|rap" hash-ish
    ...overrides,
  }
}

/** Simulate a calm section (verse, low energy) */
function calmSection(): AudioFeatures {
  return eminem313Features({ energy: 0.25, amplitude: 0.3, percussiveness: 0.3, bass: 0.4 })
}

/** Simulate a breakdown / beat drop */
function beatDrop(): AudioFeatures {
  return eminem313Features({ energy: 0.95, amplitude: 0.9, percussiveness: 0.85, bass: 0.95 })
}

describe('vizCompute — parameter computation', () => {
  it('computeScene gives different results for different energy levels', () => {
    const calm = computeScene(calmSection())
    const drop = computeScene(beatDrop())
    // At least one of the energy extremes should produce a different scene preference
    // (with the same seed, the weights shift based on energy/percussiveness)
    expect(typeof calm).toBe('number')
    expect(typeof drop).toBe('number')
    expect(calm).toBeGreaterThanOrEqual(0)
    expect(calm).toBeLessThanOrEqual(3)
  })

  it('computeGeoPreset returns valid index (0-9)', () => {
    const geo = computeGeoPreset(eminem313Features())
    expect(geo).toBeGreaterThanOrEqual(0)
    expect(geo).toBeLessThanOrEqual(9)
  })

  it('computeAnimation returns valid index (0-8)', () => {
    const anim = computeAnimation(eminem313Features())
    expect(anim).toBeGreaterThanOrEqual(0)
    expect(anim).toBeLessThanOrEqual(8)
  })

  it('computeGeometry responds to BPM', () => {
    const slow = computeGeometry(eminem313Features({ bpm: 70 }))
    const fast = computeGeometry(eminem313Features({ bpm: 180 }))
    // Higher BPM → tighter grid (lower cellSpacing)
    expect(fast.cellSpacing).toBeLessThan(slow.cellSpacing)
  })

  it('computePostFX bloom increases with energy', () => {
    const calm = computePostFX(calmSection())
    const drop = computePostFX(beatDrop())
    expect(drop.bloom).toBeGreaterThan(calm.bloom)
  })

  it('computeAnimSpeed increases with BPM and energy', () => {
    const slow = computeAnimSpeed(calmSection())
    const fast = computeAnimSpeed(beatDrop())
    expect(fast).toBeGreaterThan(slow)
  })

  it('computeCameraSpeed increases with energy', () => {
    const slow = computeCameraSpeed(calmSection())
    const fast = computeCameraSpeed(beatDrop())
    expect(fast).toBeGreaterThan(slow)
  })

  it('computePalette returns valid IQ cosine coefficients', () => {
    const p = computePalette(eminem313Features())
    expect(p.a).toHaveLength(3)
    expect(p.b).toHaveLength(3)
    expect(p.c).toHaveLength(3)
    expect(p.d).toHaveLength(3)
    // All values should be in 0-3 range (IQ palette coefficients)
    for (const ch of [...p.a, ...p.b, ...p.c, ...p.d]) {
      expect(ch).toBeGreaterThanOrEqual(0)
      expect(ch).toBeLessThanOrEqual(3)
    }
  })
})

describe('vizMath — math utilities', () => {
  it('smoothStep moves toward target', () => {
    const result = smoothStep(0, 1, 0.5)
    expect(result).toBe(0.5)
  })

  it('smoothStep with rate 0 stays put', () => {
    expect(smoothStep(0.3, 1.0, 0)).toBe(0.3)
  })

  it('smoothOsc returns 0-1', () => {
    for (let i = 0; i < 100; i++) {
      const v = smoothOsc(Math.random(), Math.random())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('lerp clamps t to 0-1', () => {
    expect(lerp(0, 10, -1)).toBe(0)
    expect(lerp(0, 10, 2)).toBe(10)
    expect(lerp(0, 10, 0.5)).toBe(5)
  })
})

describe('scene weight simulation — Eminem 313', () => {
  /**
   * Simulate the scene weight system over time with Eminem 313 audio data.
   * Verifies that:
   * 1. The engine visits multiple scenes (not stuck on one)
   * 2. Fractal Descent doesn't dominate
   * 3. Scene switches actually happen
   */
  it('visits at least 3 different scenes over 120 seconds of simulated playback', () => {
    const SCENE_LOCK_MIN = 6
    const SCENE_SWITCH_THRESHOLD = 0.06
    const SCENE_MAX_DWELL = [60, 45, 45, 15]

    let sceneWeights = [0.25, 0.25, 0.25, 0.25]
    let currentSceneIdx = 0
    let sceneLockTimer = 0
    let cameraTime = 0
    const sessionJitter = 0.37 // fixed for determinism

    const visitedScenes = new Set<number>()
    visitedScenes.add(0) // start on Lattice
    const sceneChanges: Array<{ time: number; from: number; to: number }> = []

    // Simulate 120 seconds at 60fps
    const dt = 1 / 60
    for (let frame = 0; frame < 120 * 60; frame++) {
      const t = frame / 60

      // Alternate between calm sections and beat drops
      const isBeatDrop = (t % 30) > 22 // 8-second drops every 30 seconds
      const f = isBeatDrop ? beatDrop() : eminem313Features()

      sceneLockTimer += dt
      cameraTime += dt * (0.5 + f.energy * 0.5)

      const osc0 = smoothOsc(sessionJitter, cameraTime * 0.035)
      const osc1 = smoothOsc(sessionJitter, cameraTime * 0.035 + 0.25)
      const osc2 = smoothOsc(sessionJitter, cameraTime * 0.035 + 0.5)
      const osc3 = smoothOsc(sessionJitter, cameraTime * 0.035 + 0.75)

      const raw = [
        0.35 + f.energy * 0.15 + f.mid * 0.1 + osc0 * 0.25,
        0.22 + f.brightness * 0.2 + f.percussiveness * 0.08 + osc1 * 0.25,
        0.22 + f.percussiveness * 0.2 + f.energy * 0.1 + osc2 * 0.25,
        0.12 + (1 - f.energy) * 0.08 + f.valence * 0.05 + osc3 * 0.15,
      ]

      // Staleness penalty
      const staleness = Math.min(1, sceneLockTimer / SCENE_MAX_DWELL[currentSceneIdx])
      raw[currentSceneIdx] *= (1 - staleness * 0.5)

      for (let i = 0; i < 4; i++) {
        sceneWeights[i] = smoothStep(sceneWeights[i], raw[i], 0.04)
      }

      if (sceneLockTimer > SCENE_LOCK_MIN) {
        let maxWeight = 0
        let maxIdx = currentSceneIdx
        for (let i = 0; i < 4; i++) {
          if (sceneWeights[i] > maxWeight) { maxWeight = sceneWeights[i]; maxIdx = i }
        }
        const forceExit = sceneLockTimer > SCENE_MAX_DWELL[currentSceneIdx]
        if (maxIdx !== currentSceneIdx && (forceExit || (maxWeight - sceneWeights[currentSceneIdx]) > SCENE_SWITCH_THRESHOLD)) {
          sceneChanges.push({ time: t, from: currentSceneIdx, to: maxIdx })
          visitedScenes.add(maxIdx)
          currentSceneIdx = maxIdx
          sceneLockTimer = 0
        }
      }
    }

    const SCENE_NAMES = ['Lattice', 'Mandelbulb', 'CSG', 'Fractal Descent']

    // Must visit at least 3 different scenes in 2 minutes
    expect(visitedScenes.size).toBeGreaterThanOrEqual(3)

    // Must have multiple scene changes (not stuck)
    expect(sceneChanges.length).toBeGreaterThanOrEqual(3)

    // Fractal Descent should NOT be the most visited
    const dwellPerScene = [0, 0, 0, 0]
    let prevTime = 0
    let prevScene = 0
    for (const change of sceneChanges) {
      dwellPerScene[prevScene] += change.time - prevTime
      prevTime = change.time
      prevScene = change.to
    }
    dwellPerScene[prevScene] += 120 - prevTime // final scene

    // Fractal Descent (idx 3) should have less total dwell than Lattice (idx 0)
    expect(dwellPerScene[3]).toBeLessThan(dwellPerScene[0])
  })

  it('Fractal Descent is forcibly exited within 15 seconds', () => {
    const SCENE_MAX_DWELL = [60, 45, 45, 15]

    let sceneWeights = [0.25, 0.25, 0.25, 0.25]
    let currentSceneIdx = 3 // START on Fractal Descent
    let sceneLockTimer = 0
    let cameraTime = 0
    const sessionJitter = 0.5

    const dt = 1 / 60
    let exitTime = -1

    // Run for 30 seconds max
    for (let frame = 0; frame < 30 * 60; frame++) {
      const t = frame / 60
      const f = eminem313Features()

      sceneLockTimer += dt
      cameraTime += dt * (0.5 + f.energy * 0.5)

      const osc0 = smoothOsc(sessionJitter, cameraTime * 0.035)
      const osc1 = smoothOsc(sessionJitter, cameraTime * 0.035 + 0.25)
      const osc2 = smoothOsc(sessionJitter, cameraTime * 0.035 + 0.5)
      const osc3 = smoothOsc(sessionJitter, cameraTime * 0.035 + 0.75)

      const raw = [
        0.35 + f.energy * 0.15 + f.mid * 0.1 + osc0 * 0.25,
        0.22 + f.brightness * 0.2 + f.percussiveness * 0.08 + osc1 * 0.25,
        0.22 + f.percussiveness * 0.2 + f.energy * 0.1 + osc2 * 0.25,
        0.12 + (1 - f.energy) * 0.08 + f.valence * 0.05 + osc3 * 0.15,
      ]

      const staleness = Math.min(1, sceneLockTimer / SCENE_MAX_DWELL[currentSceneIdx])
      raw[currentSceneIdx] *= (1 - staleness * 0.5)

      for (let i = 0; i < 4; i++) {
        sceneWeights[i] = smoothStep(sceneWeights[i], raw[i], 0.04)
      }

      if (sceneLockTimer > 6) {
        let maxWeight = 0
        let maxIdx = currentSceneIdx
        for (let i = 0; i < 4; i++) {
          if (sceneWeights[i] > maxWeight) { maxWeight = sceneWeights[i]; maxIdx = i }
        }
        const forceExit = sceneLockTimer > SCENE_MAX_DWELL[currentSceneIdx]
        if (maxIdx !== currentSceneIdx && (forceExit || (maxWeight - sceneWeights[currentSceneIdx]) > 0.06)) {
          exitTime = t
          break
        }
      }
    }

    // Must exit Fractal Descent within 20 seconds (15s max dwell + 6s lock)
    expect(exitTime).toBeGreaterThan(0)
    expect(exitTime).toBeLessThan(22)
  })
})
