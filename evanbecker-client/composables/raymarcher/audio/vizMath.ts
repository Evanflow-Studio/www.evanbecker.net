/**
 * Pure math utilities for the visualization engine.
 * Stateless — every function is a pure computation.
 */

/** Deterministic hash from a string → 0-1 */
export function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return (h >>> 0) / 0xFFFFFFFF
}

/** Seed from genre tags → 0-1 */
export function genreHash(genres: string[]): number {
  if (!genres.length) return 0.5
  return hashString(genres.sort().join('|'))
}

/** Smooth oscillation → 0-1 */
export function smoothOsc(seed: number, offset: number, freq: number = 1): number {
  return (Math.sin((seed + offset) * Math.PI * 2 * freq) + 1) / 2
}

/** Linear interpolation with clamped t */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

/** Exponential smoothing toward target */
export function smoothStep(current: number, target: number, rate: number): number {
  return current + (target - current) * rate
}

/** Pick an integer from a weighted distribution */
export function weightedPick(weights: number[], seed: number): number {
  const total = weights.reduce((s, w) => s + w, 0)
  let threshold = (seed * total) % total
  for (let i = 0; i < weights.length; i++) {
    threshold -= weights[i]
    if (threshold <= 0) return i
  }
  return weights.length - 1
}
