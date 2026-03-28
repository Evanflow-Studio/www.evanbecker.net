/**
 * Pure parameter computation functions for the visualization engine.
 * Each function maps AudioFeatures → visual parameters.
 * No state, no side effects, no store access.
 */

import { lerp, smoothOsc, weightedPick } from './vizMath'

/**
 * Audio feature vector — the engine's input.
 */
export interface AudioFeatures {
  bpm: number
  energy: number        // moodEnergy 0-1
  valence: number       // moodValence 0-1
  brightness: number    // spectralCentroid 0-1
  percussiveness: number // zcr 0-1
  bass: number          // 0-1
  mid: number           // 0-1
  treble: number        // 0-1
  amplitude: number     // 0-1
  genreSeed: number     // hash of genre tags, 0-1
}

export function computePalette(f: AudioFeatures): {
  a: [number, number, number]
  b: [number, number, number]
  c: [number, number, number]
  d: [number, number, number]
} {
  const s = f.genreSeed

  // A (base color) — warm vs cool shifts with energy and valence
  // Bass pushes toward reds, treble toward blues, mid toward greens
  const a: [number, number, number] = [
    lerp(0.12, 0.65, f.valence * 0.5 + f.bass * 0.25 + smoothOsc(s, 0) * 0.25),
    lerp(0.08, 0.55, f.energy * 0.4 + f.mid * 0.2 + smoothOsc(s, 0.33) * 0.4),
    lerp(0.15, 0.7, (1 - f.valence) * 0.4 + f.treble * 0.2 + smoothOsc(s, 0.66) * 0.4),
  ]

  // B (amplitude) — wider color range when loud, narrower when quiet
  // Audio bands directly modulate each channel's amplitude
  const ampScale = lerp(0.15, 0.65, f.energy)
  const b: [number, number, number] = [
    ampScale * (smoothOsc(s, 0.1) * 0.6 + f.bass * 0.4),
    ampScale * (smoothOsc(s, 0.4) * 0.6 + f.mid * 0.4),
    ampScale * (smoothOsc(s, 0.7) * 0.6 + f.treble * 0.4),
  ]

  // C (frequency) — BPM drives base rate, brightness adds shimmer
  const bpmNorm = Math.max(0, Math.min(1, (f.bpm - 60) / 140))
  const freqScale = lerp(0.5, 2.5, bpmNorm)
  const c: [number, number, number] = [
    freqScale * (0.4 + smoothOsc(s, 0.2) * 0.3 + f.brightness * 0.3),
    freqScale * (0.4 + smoothOsc(s, 0.5) * 0.3 + f.percussiveness * 0.3),
    freqScale * (0.4 + smoothOsc(s, 0.8) * 0.3 + f.energy * 0.3),
  ]

  // D (phase offset) — this is what rotates the color wheel
  // Energy and percussiveness shift hues; amplitude creates reactive color pops
  const d: [number, number, number] = [
    smoothOsc(s, 0.0, 2) * 0.6 + f.energy * 0.25 + f.amplitude * 0.15,
    smoothOsc(s, 0.33, 2) * 0.6 + f.valence * 0.2 + f.amplitude * 0.2,
    smoothOsc(s, 0.66, 2) * 0.6 + f.percussiveness * 0.2 + f.amplitude * 0.2,
  ]

  return { a, b, c, d }
}

export function computeScene(f: AudioFeatures): number {
  const weights = [
    0.3 + f.energy * 0.3 + (1 - f.percussiveness) * 0.2,
    0.1 + f.brightness * 0.2 + f.percussiveness * 0.1,
    0.1 + f.percussiveness * 0.4 + f.energy * 0.2,
    0.3 + (1 - f.energy) * 0.3 + f.valence * 0.2,
  ]
  return weightedPick(weights, f.genreSeed)
}

export function computeGeoPreset(f: AudioFeatures): number {
  const weights = [
    0.2,
    0.1 + f.percussiveness * 0.3,
    0.1 + (1 - f.percussiveness) * 0.3,
    0.05 + f.energy * 0.15,
    0.1 + f.valence * 0.2,
    0.15 + (1 - f.energy) * 0.2,
    0.1 + f.percussiveness * 0.2,
    0.1 + f.brightness * 0.15,
    0.1 + f.energy * 0.1,
    0.1 + f.percussiveness * 0.15,
  ]
  return weightedPick(weights, f.genreSeed * 7.3 % 1)
}

export function computeAnimation(f: AudioFeatures): number {
  const weights = [
    0.05 + (1 - f.energy) * 0.2,
    0.15 + (1 - f.energy) * 0.2,
    0.1 + f.percussiveness * 0.15,
    0.1 + f.energy * 0.2,
    0.05 + f.energy * 0.25,
    0.05,
    0.1 + f.energy * 0.15,
    0.05 + f.percussiveness * 0.2,
    0.1 + f.valence * 0.15,
  ]
  return weightedPick(weights, f.genreSeed * 3.7 % 1)
}

export function computeGeometry(f: AudioFeatures): { cellSpacing: number; wallThickness: number } {
  const bpmNorm = Math.max(0, Math.min(1, (f.bpm - 60) / 140))
  return {
    cellSpacing: lerp(0.08, 0.35, 1 - bpmNorm * 0.6 - f.energy * 0.4),
    wallThickness: lerp(0.15, 0.65, f.percussiveness * 0.5 + f.energy * 0.3 + f.genreSeed * 0.2),
  }
}

export function computePostFX(f: AudioFeatures): { bloom: number; chromatic: number; fog: number; zoom: number } {
  return {
    bloom: lerp(0.0, 0.6, f.energy * 0.6 + f.bass * 0.4),
    chromatic: lerp(0.0, 0.3, f.percussiveness * 0.5 + f.energy * 0.3 + f.genreSeed * 0.2),
    fog: lerp(0.0005, 0.008, (1 - f.brightness) * 0.6 + (1 - f.energy) * 0.4),
    zoom: lerp(0.8, 1.4, f.brightness * 0.5 + f.valence * 0.3 + f.genreSeed * 0.2),
  }
}

export function computeAnimSpeed(f: AudioFeatures): number {
  const bpmNorm = Math.max(0, Math.min(1, (f.bpm - 60) / 140))
  return lerp(0.3, 2.5, bpmNorm * 0.6 + f.energy * 0.4)
}

export function computeCameraSpeed(f: AudioFeatures): number {
  return lerp(0.01, 0.06, f.energy * 0.5 + (f.bpm / 200) * 0.3 + f.percussiveness * 0.2)
}
